'use strict';
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

let tournamentState = null;

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function calculateResults(state) {
    const { players, config, eliminatedByRound, currentRoundPlayers } = state;
    const { inscricao, orgPercent, prizePercentages } = config;
    const totalArrecadado = players.length * inscricao;
    const orgValue = totalArrecadado * (orgPercent / 100);
    const prizePool = totalArrecadado - orgValue;
    const placements = [];
    placements.push({ rank: 1, name: currentRoundPlayers[0] });
    const finalLosers = eliminatedByRound[eliminatedByRound.length - 1] || [];
    if (finalLosers.length > 0) placements.push({ rank: 2, name: finalLosers[0] });
    const semiFinalLosers = eliminatedByRound[eliminatedByRound.length - 2] || [];
    if (semiFinalLosers.length > 0) placements.push({ rank: 3, name: semiFinalLosers[0] });
    if (semiFinalLosers.length > 1) placements.push({ rank: 4, name: semiFinalLosers[1] });
    const results = placements.map((p, i) => {
        const prizeValue = prizePool * (prizePercentages[i] / 100);
        return { ...p, prize: prizeValue };
    });
    return { summary: { totalArrecadado, orgValue, prizePool }, placements: results };
}

app.get('/', (req, res) => {
   const now = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
   const FRONTEND_URL = 'https://SUA-URL-DO-FRONTEND.netlify.app'; 
   const html = `
   <!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>API - Painel de Torneio</title><script src="https://cdn.tailwindcss.com/"></script><style>body { font-family: 'Inter', sans-serif; } @import url('https://rsms.me/inter/inter.css'); .endpoint-badge { display: inline-block; padding: 0.25rem 0.6rem; font-family: monospace; font-weight: bold; border-radius: 0.375rem; font-size: 0.9rem; } .get { background-color: #E0F2FE; color: #0284C7; } .post { background-color: #D1FAE5; color: #059669; }</style></head><body class="bg-gray-100 text-gray-800"><div class="container mx-auto p-4 md:p-8 max-w-4xl"><header class="text-center mb-8"><h1 class="text-4xl font-bold text-gray-900">API do Painel de Torneio</h1><p class="text-lg text-gray-600 mt-2">API para gerenciamento de torneios de eliminação simples.</p><div class="mt-4 inline-flex items-center bg-green-100 text-green-800 text-sm font-medium px-4 py-2 rounded-full"><span class="w-3 h-3 bg-green-500 rounded-full mr-2"></span>API Operacional</div></header><main class="bg-white p-6 rounded-lg shadow-md"><h2 class="text-2xl font-semibold mb-4 border-b pb-2">Endpoints Disponíveis</h2><div class="space-y-6"><div><h3 class="text-xl font-medium mb-1"><span class="endpoint-badge get">GET</span> /api/tournament</h3><p class="text-gray-600">Retorna o estado atual do torneio em andamento.</p></div><div><h3 class="text-xl font-medium mb-1"><span class="endpoint-badge post">POST</span> /api/tournament/start</h3><p class="text-gray-600">Cria um novo torneio.</p></div><div><h3 class="text-xl font-medium mb-1"><span class="endpoint-badge post">POST</span> /api/tournament/next-round</h3><p class="text-gray-600">Avança o torneio para a próxima rodada.</p></div><div><h3 class="text-xl font-medium mb-1"><span class="endpoint-badge post">POST</span> /api/tournament/reset</h3><p class="text-gray-600">Limpa o estado do torneio atual no servidor.</p></div></div><div class="text-center mt-8 border-t pt-6"><a href="${FRONTEND_URL}" target="_blank" class="bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors text-lg">Acessar o Painel de Controle</a></div></main><footer class="text-center mt-8 text-sm text-gray-500"><p>Status verificado em: ${now}</p></footer></div></body></html>`;
   res.setHeader('Content-Type', 'text/html');
   res.send(html);
});

app.post('/api/tournament/start', (req, res) => {
    const { config, players } = req.body;
    if (!config || !players || players.length < 2) { return res.status(400).json({ error: 'Dados de configuração ou jogadores inválidos.' }); }
    const shuffledPlayers = shuffleArray([...players]);
    tournamentState = { config: config, players: players, currentRoundPlayers: shuffledPlayers, roundNumber: 1, eliminatedByRound: [], matches: [], winner: null, results: null };
    const matches = [];
    for (let i = 0; i < shuffledPlayers.length; i += 2) { if (i + 1 < shuffledPlayers.length) { matches.push([shuffledPlayers[i], shuffledPlayers[i + 1]]); } }
    tournamentState.matches = matches;
    res.status(201).json(tournamentState);
});

app.post('/api/tournament/next-round', (req, res) => {
    if (!tournamentState || tournamentState.winner) { return res.status(400).json({ error: 'Nenhum torneio ativo para avançar.' }); }
    const { winners } = req.body;
    if (!winners || winners.length !== tournamentState.matches.length) { return res.status(400).json({ error: 'Número de vencedores incorreto.' }); }
    const losers = tournamentState.matches.flat().filter(player => !winners.includes(player));
    tournamentState.eliminatedByRound.push(losers);
    let nextRoundPlayers = [...winners];
    if (tournamentState.currentRoundPlayers.length % 2 !== 0) { nextRoundPlayers.push(tournamentState.currentRoundPlayers[tournamentState.currentRoundPlayers.length - 1]); }
    tournamentState.currentRoundPlayers = nextRoundPlayers;
    tournamentState.roundNumber++;
    if (nextRoundPlayers.length <= 1) {
        tournamentState.winner = nextRoundPlayers[0];
        tournamentState.matches = [];
        tournamentState.results = calculateResults(tournamentState);
    } else {
        const newMatches = [];
        for (let i = 0; i < nextRoundPlayers.length; i += 2) { if (i + 1 < nextRoundPlayers.length) { newMatches.push([nextRoundPlayers[i], nextRoundPlayers[i + 1]]); } }
        tournamentState.matches = newMatches;
    }
    res.status(200).json(tournamentState);
});

app.get('/api/tournament', (req, res) => {
    if (!tournamentState) { return res.status(404).json({ message: 'Nenhum torneio em andamento.' }); }
    res.status(200).json(tournamentState);
});

app.post('/api/tournament/reset', (req, res) => {
    tournamentState = null;
    res.status(200).json({ message: 'Torneio reiniciado com sucesso.' });
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor da API do torneio rodando em http://localhost:${PORT}`);
});
