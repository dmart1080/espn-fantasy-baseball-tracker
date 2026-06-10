import fetch from 'node-fetch';

const ESPN_BASE = 'https://fantasy.espn.com/apis/v3/games/flb';

function buildHeaders(espn_s2, swid) {
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Origin': 'https://fantasy.espn.com',
    'Referer': 'https://fantasy.espn.com/',
  };
  if (espn_s2 && swid) {
    headers['Cookie'] = `espn_s2=${espn_s2}; SWID=${swid}`;
  }
  return headers;
}

// Log ESPN errors clearly so users know they need cookies
function espnError(label, status, leagueId) {
  if (status === 401 || status === 403) {
    console.warn(`[ESPN] ${label} league ${leagueId} → ${status}. This league is private — add espn_s2 + SWID cookies in Settings.`);
  } else {
    console.error(`[ESPN] ${label} league ${leagueId} → ${status}`);
  }
}

export async function fetchLeague(leagueId, season, espn_s2, swid) {
  const url = `${ESPN_BASE}/seasons/${season}/segments/0/leagues/${leagueId}?view=mRoster&view=mTeam&view=mSettings`;
  try {
    const res = await fetch(url, { headers: buildHeaders(espn_s2, swid) });
    if (!res.ok) throw new Error(`ESPN API returned ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('fetchLeague error:', err.message);
    return getMockLeagueData(leagueId, season);
  }
}

export async function fetchLeagueRosters(leagueId, season, espn_s2, swid) {
  const url = `${ESPN_BASE}/seasons/${season}/segments/0/leagues/${leagueId}?view=mRoster&view=mTeam`;
  try {
    const res = await fetch(url, { headers: buildHeaders(espn_s2, swid) });
    if (!res.ok) throw new Error(`ESPN API returned ${res.status}`);
    const data = await res.json();
    return parseRosters(data);
  } catch (err) {
    console.error('fetchLeagueRosters error:', err.message);
    return getMockRosters();
  }
}

export async function fetchFreeAgents(leagueId, season, espn_s2, swid) {
  const filterObj = {
    players: {
      filterStatus: { value: ['FREEAGENT', 'WAIVERS'] },
      filterSlotIds: { value: [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19] },
      limit: 50,
      sortPercOwned: { sortAsc: false, sortPriority: 1 },
      filterStatsForCurrentSeasonScoringPeriodId: { value: [1] },
    }
  };
  const url = `${ESPN_BASE}/seasons/${season}/segments/0/leagues/${leagueId}?view=kona_player_info`;
  try {
    const res = await fetch(url, {
      headers: {
        ...buildHeaders(espn_s2, swid),
        'X-Fantasy-Filter': JSON.stringify(filterObj),
      }
    });
    if (!res.ok) throw new Error(`ESPN API returned ${res.status}`);
    const data = await res.json();
    return parseFreeAgents(data);
  } catch (err) {
    console.error('fetchFreeAgents error:', err.message);
    return getMockFreeAgents();
  }
}

function parseRosters(data) {
  if (!data || !data.teams) return getMockRosters();
  return data.teams.map(team => ({
    id: team.id,
    name: `${team.location || ''} ${team.nickname || ''}`.trim() || `Team ${team.id}`,
    abbrev: team.abbrev,
    wins: team.record?.overall?.wins ?? 0,
    losses: team.record?.overall?.losses ?? 0,
    ties: team.record?.overall?.ties ?? 0,
    players: (team.roster?.entries || []).map(entry => ({
      id: entry.playerId,
      name: entry.playerPoolEntry?.playerInfo?.fullName || 'Unknown',
      position: getPositionName(entry.lineupSlotId),
      eligiblePositions: (entry.playerPoolEntry?.playerInfo?.eligibleSlots || []).map(getPositionName).filter(Boolean),
      injuryStatus: entry.playerPoolEntry?.playerInfo?.injuryStatus || 'ACTIVE',
      proTeam: entry.playerPoolEntry?.playerInfo?.proTeamId,
      stats: parsePlayerStats(entry.playerPoolEntry?.playerInfo?.stats),
    }))
  }));
}

function parseFreeAgents(data) {
  if (!data || !data.players) return getMockFreeAgents();
  return data.players.map(p => ({
    id: p.id,
    name: p.playerPoolEntry?.playerInfo?.fullName || 'Unknown',
    position: getPositionName(p.playerPoolEntry?.playerInfo?.defaultPositionId),
    ownedPct: p.playerPoolEntry?.percentOwned ?? 0,
    injuryStatus: p.playerPoolEntry?.playerInfo?.injuryStatus || 'ACTIVE',
    stats: parsePlayerStats(p.playerPoolEntry?.playerInfo?.stats),
  }));
}

function parsePlayerStats(stats) {
  if (!Array.isArray(stats)) return {};
  const current = stats.find(s => s.seasonId === new Date().getFullYear() && s.statSplitTypeId === 0);
  return current?.stats || {};
}

function getPositionName(slotId) {
  const slots = {
    0: 'C', 1: '1B', 2: '2B', 3: '3B', 4: 'SS',
    5: 'OF', 6: 'OF', 7: 'OF', 8: 'DH', 9: 'SP',
    10: 'SP', 11: 'RP', 12: 'RP', 13: 'P', 14: 'P',
    15: 'BN', 16: 'IL', 17: 'NA',
  };
  return slots[slotId] || 'UTIL';
}

// Full player pool — each player appears on exactly one team
const MOCK_PLAYER_POOL = [
  // C
  { id: 1001, name: 'William Contreras',  pos: 0,  team: 'MIL', injury: 'ACTIVE' },
  { id: 1002, name: 'Adley Rutschman',    pos: 0,  team: 'BAL', injury: 'ACTIVE' },
  { id: 1003, name: 'J.T. Realmuto',      pos: 0,  team: 'PHI', injury: 'ACTIVE' },
  { id: 1004, name: 'Salvador Perez',     pos: 0,  team: 'KC',  injury: 'ACTIVE' },
  { id: 1005, name: 'Sean Murphy',        pos: 0,  team: 'ATL', injury: 'QUESTIONABLE' },
  { id: 1006, name: 'Cal Raleigh',        pos: 0,  team: 'SEA', injury: 'ACTIVE' },
  { id: 1007, name: 'Francisco Alvarez',  pos: 0,  team: 'NYM', injury: 'ACTIVE' },
  { id: 1008, name: 'Gabriel Moreno',     pos: 0,  team: 'ARI', injury: 'ACTIVE' },
  { id: 1009, name: 'Patrick Bailey',     pos: 0,  team: 'SF',  injury: 'ACTIVE' },
  { id: 1010, name: 'Tyler Stephenson',   pos: 0,  team: 'CIN', injury: 'ACTIVE' },
  // 1B
  { id: 1011, name: 'Freddie Freeman',    pos: 1,  team: 'LAD', injury: 'ACTIVE' },
  { id: 1012, name: 'Bryce Harper',       pos: 1,  team: 'PHI', injury: 'ACTIVE' },
  { id: 1013, name: 'Paul Goldschmidt',   pos: 1,  team: 'STL', injury: 'ACTIVE' },
  { id: 1014, name: 'Pete Alonso',        pos: 1,  team: 'NYM', injury: 'ACTIVE' },
  { id: 1015, name: 'Christian Walker',   pos: 1,  team: 'ARI', injury: 'ACTIVE' },
  { id: 1016, name: 'Matt Olson',         pos: 1,  team: 'ATL', injury: 'ACTIVE' },
  { id: 1017, name: 'Vladimir Guerrero Jr.', pos: 1, team: 'TOR', injury: 'ACTIVE' },
  { id: 1018, name: 'Spencer Torkelson',  pos: 1,  team: 'DET', injury: 'ACTIVE' },
  { id: 1019, name: 'Josh Bell',          pos: 1,  team: 'CLE', injury: 'ACTIVE' },
  { id: 1020, name: 'Anthony Rizzo',      pos: 1,  team: 'NYY', injury: 'IL10' },
  // 2B
  { id: 1021, name: 'Jose Altuve',        pos: 2,  team: 'HOU', injury: 'ACTIVE' },
  { id: 1022, name: 'Marcus Semien',      pos: 2,  team: 'TEX', injury: 'ACTIVE' },
  { id: 1023, name: 'Gleyber Torres',     pos: 2,  team: 'NYY', injury: 'ACTIVE' },
  { id: 1024, name: 'Ozzie Albies',       pos: 2,  team: 'ATL', injury: 'ACTIVE' },
  { id: 1025, name: 'Jeff McNeil',        pos: 2,  team: 'NYM', injury: 'ACTIVE' },
  { id: 1026, name: 'Brendan Rodgers',    pos: 2,  team: 'COL', injury: 'ACTIVE' },
  { id: 1027, name: 'Luis Arraez',        pos: 2,  team: 'SD',  injury: 'ACTIVE' },
  { id: 1028, name: 'DJ LeMahieu',        pos: 2,  team: 'NYY', injury: 'QUESTIONABLE' },
  { id: 1029, name: 'Andres Gimenez',     pos: 2,  team: 'CLE', injury: 'ACTIVE' },
  { id: 1030, name: 'Jorge Polanco',      pos: 2,  team: 'SEA', injury: 'ACTIVE' },
  // 3B
  { id: 1031, name: 'Manny Machado',      pos: 3,  team: 'SD',  injury: 'ACTIVE' },
  { id: 1032, name: 'Austin Riley',       pos: 3,  team: 'ATL', injury: 'ACTIVE' },
  { id: 1033, name: 'Rafael Devers',      pos: 3,  team: 'BOS', injury: 'ACTIVE' },
  { id: 1034, name: 'Jose Ramirez',       pos: 3,  team: 'CLE', injury: 'ACTIVE' },
  { id: 1035, name: 'Nolan Arenado',      pos: 3,  team: 'STL', injury: 'ACTIVE' },
  { id: 1036, name: 'Max Muncy',          pos: 3,  team: 'LAD', injury: 'ACTIVE' },
  { id: 1037, name: 'Gunnar Henderson',   pos: 3,  team: 'BAL', injury: 'ACTIVE' },
  { id: 1038, name: 'Ke\'Bryan Hayes',    pos: 3,  team: 'PIT', injury: 'ACTIVE' },
  { id: 1039, name: 'Eugenio Suarez',     pos: 3,  team: 'ARI', injury: 'ACTIVE' },
  { id: 1040, name: 'Alec Bohm',          pos: 3,  team: 'PHI', injury: 'ACTIVE' },
  // SS
  { id: 1041, name: 'Trea Turner',        pos: 4,  team: 'PHI', injury: 'ACTIVE' },
  { id: 1042, name: 'Carlos Correa',      pos: 4,  team: 'MIN', injury: 'ACTIVE' },
  { id: 1043, name: 'Corey Seager',       pos: 4,  team: 'TEX', injury: 'ACTIVE' },
  { id: 1044, name: 'Xander Bogaerts',    pos: 4,  team: 'SD',  injury: 'ACTIVE' },
  { id: 1045, name: 'Willy Adames',       pos: 4,  team: 'MIL', injury: 'ACTIVE' },
  { id: 1046, name: 'Bo Bichette',        pos: 4,  team: 'TOR', injury: 'ACTIVE' },
  { id: 1047, name: 'Jeremy Pena',        pos: 4,  team: 'HOU', injury: 'ACTIVE' },
  { id: 1048, name: 'CJ Abrams',          pos: 4,  team: 'WSH', injury: 'ACTIVE' },
  { id: 1049, name: 'Anthony Volpe',      pos: 4,  team: 'NYY', injury: 'ACTIVE' },
  { id: 1050, name: 'Ezequiel Tovar',     pos: 4,  team: 'COL', injury: 'ACTIVE' },
  // OF
  { id: 1051, name: 'Shohei Ohtani',      pos: 5,  team: 'LAD', injury: 'ACTIVE' },
  { id: 1052, name: 'Ronald Acuna Jr.',   pos: 5,  team: 'ATL', injury: 'ACTIVE' },
  { id: 1053, name: 'Mike Trout',         pos: 5,  team: 'LAA', injury: 'ACTIVE' },
  { id: 1054, name: 'Yordan Alvarez',     pos: 5,  team: 'HOU', injury: 'ACTIVE' },
  { id: 1055, name: 'Juan Soto',          pos: 5,  team: 'NYY', injury: 'ACTIVE' },
  { id: 1056, name: 'Kyle Tucker',        pos: 5,  team: 'CHC', injury: 'ACTIVE' },
  { id: 1057, name: 'Julio Rodriguez',    pos: 5,  team: 'SEA', injury: 'ACTIVE' },
  { id: 1058, name: 'Corbin Carroll',     pos: 5,  team: 'ARI', injury: 'ACTIVE' },
  { id: 1059, name: 'Cedric Mullins',     pos: 5,  team: 'BAL', injury: 'ACTIVE' },
  { id: 1060, name: 'Teoscar Hernandez',  pos: 5,  team: 'LAD', injury: 'ACTIVE' },
  { id: 1061, name: 'Bryan Reynolds',     pos: 5,  team: 'PIT', injury: 'ACTIVE' },
  { id: 1062, name: 'Randy Arozarena',    pos: 5,  team: 'TB',  injury: 'ACTIVE' },
  { id: 1063, name: 'Ian Happ',           pos: 5,  team: 'CHC', injury: 'ACTIVE' },
  { id: 1064, name: 'Lourdes Gurriel Jr.',pos: 5,  team: 'ARI', injury: 'ACTIVE' },
  { id: 1065, name: 'George Springer',    pos: 5,  team: 'TOR', injury: 'QUESTIONABLE' },
  { id: 1066, name: 'Cody Bellinger',     pos: 5,  team: 'NYY', injury: 'ACTIVE' },
  { id: 1067, name: 'Daulton Varsho',     pos: 5,  team: 'TOR', injury: 'ACTIVE' },
  { id: 1068, name: 'MJ Melendez',        pos: 5,  team: 'KC',  injury: 'ACTIVE' },
  { id: 1069, name: 'Starling Marte',     pos: 5,  team: 'NYM', injury: 'IL10' },
  { id: 1070, name: 'Lars Nootbaar',      pos: 5,  team: 'STL', injury: 'ACTIVE' },
  // SP
  { id: 1071, name: 'Gerrit Cole',        pos: 9,  team: 'NYY', injury: 'ACTIVE' },
  { id: 1072, name: 'Spencer Strider',    pos: 9,  team: 'ATL', injury: 'ACTIVE' },
  { id: 1073, name: 'Zack Wheeler',       pos: 9,  team: 'PHI', injury: 'ACTIVE' },
  { id: 1074, name: 'Sandy Alcantara',    pos: 9,  team: 'MIA', injury: 'ACTIVE' },
  { id: 1075, name: 'Logan Gilbert',      pos: 9,  team: 'SEA', injury: 'ACTIVE' },
  { id: 1076, name: 'Framber Valdez',     pos: 9,  team: 'HOU', injury: 'ACTIVE' },
  { id: 1077, name: 'Freddy Peralta',     pos: 9,  team: 'MIL', injury: 'ACTIVE' },
  { id: 1078, name: 'Dylan Cease',        pos: 9,  team: 'SD',  injury: 'ACTIVE' },
  { id: 1079, name: 'Pablo Lopez',        pos: 9,  team: 'MIN', injury: 'ACTIVE' },
  { id: 1080, name: 'Corbin Burnes',      pos: 9,  team: 'BAL', injury: 'ACTIVE' },
  { id: 1081, name: 'Nestor Cortes',      pos: 9,  team: 'NYY', injury: 'ACTIVE' },
  { id: 1082, name: 'Max Fried',          pos: 9,  team: 'ATL', injury: 'ACTIVE' },
  { id: 1083, name: 'Chris Sale',         pos: 9,  team: 'ATL', injury: 'ACTIVE' },
  { id: 1084, name: 'Kevin Gausman',      pos: 9,  team: 'TOR', injury: 'ACTIVE' },
  { id: 1085, name: 'Shane McClanahan',   pos: 9,  team: 'TB',  injury: 'IL60' },
  { id: 1086, name: 'Cristian Javier',    pos: 9,  team: 'HOU', injury: 'ACTIVE' },
  { id: 1087, name: 'Brandon Woodruff',   pos: 9,  team: 'MIL', injury: 'ACTIVE' },
  { id: 1088, name: 'Reid Detmers',       pos: 9,  team: 'LAA', injury: 'ACTIVE' },
  { id: 1089, name: 'George Kirby',       pos: 9,  team: 'SEA', injury: 'ACTIVE' },
  { id: 1090, name: 'Yoshinobu Yamamoto', pos: 9,  team: 'LAD', injury: 'ACTIVE' },
  // RP
  { id: 1091, name: 'Felix Bautista',     pos: 11, team: 'BAL', injury: 'ACTIVE' },
  { id: 1092, name: 'Josh Hader',         pos: 11, team: 'HOU', injury: 'ACTIVE' },
  { id: 1093, name: 'Emmanuel Clase',     pos: 11, team: 'CLE', injury: 'ACTIVE' },
  { id: 1094, name: 'Ryan Helsley',       pos: 11, team: 'STL', injury: 'ACTIVE' },
  { id: 1095, name: 'Devin Williams',     pos: 11, team: 'MIL', injury: 'ACTIVE' },
  { id: 1096, name: 'Alexis Diaz',        pos: 11, team: 'CIN', injury: 'ACTIVE' },
  { id: 1097, name: 'Andres Munoz',       pos: 11, team: 'SEA', injury: 'ACTIVE' },
  { id: 1098, name: 'Clay Holmes',        pos: 11, team: 'NYY', injury: 'ACTIVE' },
  { id: 1099, name: 'Evan Phillips',      pos: 11, team: 'LAD', injury: 'ACTIVE' },
  { id: 1100, name: 'Pete Fairbanks',     pos: 11, team: 'TB',  injury: 'ACTIVE' },
];

// Seeded random — same values every time for same seed, different per team/player
function seededRand(seed) {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

function mockBatterStats(playerId) {
  const s = playerId;
  return {
    avg:  (seededRand(s)      * 0.120 + 0.220).toFixed(3),
    hr:   Math.floor(seededRand(s + 1) * 35 + 3),
    rbi:  Math.floor(seededRand(s + 2) * 90 + 20),
    sb:   Math.floor(seededRand(s + 3) * 35),
    era:  '—',
    whip: '—',
    k9:   '—',
    sv:   0,
  };
}

function mockPitcherStats(playerId) {
  const s = playerId;
  return {
    avg:  '—',
    hr:   0,
    rbi:  0,
    sb:   0,
    era:  (seededRand(s)      * 3.0 + 2.2).toFixed(2),
    whip: (seededRand(s + 1)  * 0.55 + 0.95).toFixed(2),
    k9:   (seededRand(s + 2)  * 5.0 + 7.0).toFixed(1),
    sv:   Math.floor(seededRand(s + 3) * 35),
  };
}

const TEAM_NAMES = [
  ['Big League', 'Chew'],     ['Dinger', 'Kings'],      ['Ace', 'Hunters'],
  ['Base', 'Stealers'],       ['Power', 'Surge'],        ['The', 'Analytics'],
  ['Roto', 'Rulers'],         ['Diamond', 'Dogs'],       ['Fastball', 'Factory'],
  ['Speed', 'Demons'],
];

// Slot positions each team roster needs: 1C 1-1B 1-2B 1-3B 1-SS 3-OF 2-SP 1-RP 1-SP = 12
const ROSTER_TEMPLATE = [0, 1, 2, 3, 4, 5, 5, 5, 9, 9, 9, 11];

function buildMockTeams() {
  // Separate pool by position
  const byPos = {};
  for (const p of MOCK_PLAYER_POOL) {
    if (!byPos[p.pos]) byPos[p.pos] = [];
    byPos[p.pos].push(p);
  }

  // Shuffle each position bucket with a fixed seed so assignment is stable
  for (const pos of Object.keys(byPos)) {
    byPos[pos].sort((a, b) => seededRand(a.id * 13) - seededRand(b.id * 13));
  }

  const posIndex = {};

  return TEAM_NAMES.map(([loc, nick], teamIdx) => {
    const entries = ROSTER_TEMPLATE.map(pos => {
      if (!posIndex[pos]) posIndex[pos] = 0;
      const pool = byPos[pos] || [];
      const player = pool[posIndex[pos] % pool.length];
      posIndex[pos]++;
      return player;
    });

    const wins  = Math.floor(seededRand(teamIdx * 7)  * 55 + 20);
    const losses= Math.floor(seededRand(teamIdx * 7 + 1) * 45 + 15);

    return {
      id: teamIdx + 1,
      name: `${loc} ${nick}`,
      abbrev: loc.substring(0, 3).toUpperCase(),
      wins,
      losses,
      ties: 0,
      players: entries.map(p => {
        const isPitcher = p.pos === 9 || p.pos === 11;
        return {
          id: p.id,
          name: p.name,
          position: getPositionName(p.pos),
          eligiblePositions: [getPositionName(p.pos)],
          injuryStatus: p.injury,
          stats: isPitcher ? mockPitcherStats(p.id) : mockBatterStats(p.id),
        };
      }),
    };
  });
}

// Cached so teams don't reshuffle between requests
let _mockTeams = null;
function getMockTeams() {
  if (!_mockTeams) _mockTeams = buildMockTeams();
  return _mockTeams;
}

// Mock data for when ESPN API is unavailable
function getMockLeagueData(leagueId, season) {
  return {
    id: leagueId,
    settings: { name: `Mock League ${leagueId}` },
    teams: getMockTeams(),
    mock: true,
  };
}

export function getMockRosters() {
  return getMockTeams();
}

export function getMockFreeAgents() {
  const names = [
    'Luis Garcia', 'Jake McCarthy', 'Ezequiel Tovar', 'Wilyer Abreu',
    'James Outman', 'Adael Amador', 'Jordan Beck', 'Jonah Bride',
    'Austin Slater', 'Brandon Nimmo', 'Tyler Soderstrom', 'Miguel Vargas',
    'Bobby Witt Jr.', 'Julio Rodriguez', 'Francisco Alvarez', 'Corbin Carroll',
  ];
  const positions = ['C', '1B', '2B', '3B', 'SS', 'OF', 'OF', 'OF', 'SP', 'SP', 'RP', 'RP'];
  return names.map((name, i) => ({
    id: 2000 + i,
    name,
    position: positions[i % positions.length],
    ownedPct: Math.random() * 60,
    injuryStatus: 'ACTIVE',
    stats: {
      avg: (Math.random() * 0.120 + 0.220).toFixed(3),
      hr: Math.floor(Math.random() * 25 + 2),
      rbi: Math.floor(Math.random() * 70 + 10),
      sb: Math.floor(Math.random() * 25),
      era: (Math.random() * 3.5 + 2.5).toFixed(2),
      whip: (Math.random() * 0.7 + 1.0).toFixed(2),
    }
  }));
}
