import fetch from 'node-fetch';

const ESPN_BASE = 'https://fantasy.espn.com/apis/v3/games/flb';

function buildHeaders(espn_s2, swid) {
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
  if (espn_s2 && swid) {
    headers['Cookie'] = `espn_s2=${espn_s2}; SWID=${swid}`;
  }
  return headers;
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

// Mock data for when API is unavailable
function getMockLeagueData(leagueId, season) {
  return {
    id: leagueId,
    settings: { name: `Mock League ${leagueId}` },
    teams: getMockTeams(),
    mock: true,
  };
}

function getMockTeams() {
  const teamNames = [
    ['Big League', 'Chew'], ['Dinger', 'Kings'], ['Ace', 'Hunters'],
    ['Base', 'Stealers'], ['Power', 'Surge'], ['The', 'Analytics'],
    ['Roto', 'Rulers'], ['Diamond', 'Dogs'], ['Fastball', 'Factory'], ['Speed', 'Demons']
  ];
  return teamNames.map((name, i) => ({
    id: i + 1,
    location: name[0],
    nickname: name[1],
    abbrev: name[0].substring(0, 3).toUpperCase(),
    record: { overall: { wins: Math.floor(Math.random() * 60 + 20), losses: Math.floor(Math.random() * 40 + 10), ties: 0 } },
    roster: { entries: getMockRosterEntries() }
  }));
}

function getMockRosterEntries() {
  const players = [
    { id: 1001, name: 'Shohei Ohtani', pos: 0 },
    { id: 1002, name: 'Freddie Freeman', pos: 1 },
    { id: 1003, name: 'Jose Altuve', pos: 2 },
    { id: 1004, name: 'Manny Machado', pos: 3 },
    { id: 1005, name: 'Trea Turner', pos: 4 },
    { id: 1006, name: 'Mike Trout', pos: 5 },
    { id: 1007, name: 'Ronald Acuna Jr.', pos: 5 },
    { id: 1008, name: 'Yordan Alvarez', pos: 5 },
    { id: 1009, name: 'Gerrit Cole', pos: 9 },
    { id: 1010, name: 'Spencer Strider', pos: 9 },
    { id: 1011, name: 'Felix Bautista', pos: 11 },
    { id: 1012, name: 'Josh Hader', pos: 11 },
  ];
  return players.map(p => ({
    playerId: p.id,
    lineupSlotId: p.pos,
    playerPoolEntry: {
      percentOwned: Math.random() * 40 + 60,
      playerInfo: {
        fullName: p.name,
        defaultPositionId: p.pos,
        eligibleSlots: [p.pos],
        injuryStatus: Math.random() > 0.9 ? 'QUESTIONABLE' : 'ACTIVE',
        stats: []
      }
    }
  }));
}

export function getMockRosters() {
  return getMockTeams().map(team => ({
    id: team.id,
    name: `${team.location} ${team.nickname}`,
    abbrev: team.abbrev,
    wins: team.record.overall.wins,
    losses: team.record.overall.losses,
    ties: team.record.overall.ties,
    players: team.roster.entries.map(e => ({
      id: e.playerId,
      name: e.playerPoolEntry.playerInfo.fullName,
      position: getPositionName(e.lineupSlotId),
      eligiblePositions: [getPositionName(e.lineupSlotId)],
      injuryStatus: e.playerPoolEntry.playerInfo.injuryStatus,
      stats: {
        avg: (Math.random() * 0.120 + 0.220).toFixed(3),
        hr: Math.floor(Math.random() * 35 + 5),
        rbi: Math.floor(Math.random() * 90 + 20),
        sb: Math.floor(Math.random() * 30),
        era: (Math.random() * 3 + 2).toFixed(2),
        whip: (Math.random() * 0.6 + 0.9).toFixed(2),
        k9: (Math.random() * 4 + 7).toFixed(1),
        sv: Math.floor(Math.random() * 30),
      }
    }))
  }));
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
