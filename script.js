document.addEventListener('DOMContentLoaded', () => {
    'use strict';

    // =================================================================================
    // ESTADO DA APLICAÇÃO
    // =================================================================================
    let state = {};

    function resetState() {
        state = {
            view: 'config', // 'config', 'playerNames', 'tournament', 'results'
            players: [],
            currentRoundPlayers: [],
            roundNumber: 1,
            eliminatedByRound: [],
            matches: [],
            config: {
                numPlayers: 8,
                inscricao: 10,
                orgPercent: 20,
                prizePercentages: [50, 30, 15, 5],
            },
            results: null,
        };
    }

    // =================================================================================
    // ELEMENTO PRINCIPAL DA DOM
    // =================================================================================
    const appContainer = document.getElementById('app');

    // =================================================================================
    // LÓGICA DO TORNEIO
    // =================================================================================
    function shuffleArray(array) {
        const newArray = [...array];
        for (let i = newArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
        }
        return newArray;
    }

    function calculateResults() {
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
        
        state.results = {
            summary: { totalArrecadado, orgValue, prizePool },
            placements: placements.map((p, i) => ({
                ...p,
                prize: prizePool * ((prizePercentages[i] || 0) / 100),
            })),
        };
    }
    
    // =================================================================================
    // RENDERIZAÇÃO DA UI
    // =================================================================================
    function render() {
        appContainer.innerHTML = '';
        let viewComponent;

        switch (state.view) {
            case 'playerNames':
                viewComponent = createPlayerNamesView();
                break;
            case 'tournament':
                viewComponent = createTournamentView();
                break;
            case 'results':
                viewComponent = createResultsView();
                break;
            case 'config':
            default:
                viewComponent = createConfigView();
                break;
        }
        appContainer.append(viewComponent);
        addEventListeners(); // Adiciona os listeners após a renderização
    }

    // =================================================================================
    // "COMPONENTES" DA UI (Fábricas de HTML)
    // =================================================================================
    function createConfigView() {
        return createComponent('div', { className: 'view-container bg-white p-6 md:p-8 rounded-xl shadow-lg' }, [
            createComponent('h2', { textContent: 'Configurações do Torneio', className: 'text-2xl font-bold mb-6 text-center' }),
            createComponent('form', { id: 'configForm', className: 'space-y-6' }, [
                 createComponent('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-6' }, [
                    createComponent('div', {}, [
                        createComponent('label', { htmlFor: 'numPlayers', textContent: 'Jogadores (mín. 2):', className: 'block text-lg mb-2' }),
                        createComponent('input', { type: 'number', id: 'numPlayers', min: 2, value: state.config.numPlayers, className: 'border p-2 w-full rounded-md', required: true })
                    ]),
                    createComponent('div', {}, [
                        createComponent('label', { htmlFor: 'inscricao', textContent: 'Inscrição (R$):', className: 'block text-lg mb-2' }),
                        createComponent('input', { type: 'number', id: 'inscricao', min: 0, step: '0.01', value: state.config.inscricao, className: 'border p-2 w-full rounded-md', required: true })
                    ]),
                 ]),
                createComponent('button', { type: 'submit', className: 'w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors', textContent: 'Definir Jogadores' })
            ])
        ]);
    }

    function createPlayerNamesView() {
        const nameInputs = Array.from({ length: state.config.numPlayers }, (_, i) =>
            createComponent('input', { type: 'text', placeholder: `Nome do Jogador ${i + 1}`, className: 'border p-2 w-full rounded-md' })
        );
        return createComponent('div', { className: 'view-container bg-white p-6 md:p-8 rounded-xl shadow-lg' }, [
            createComponent('h2', { textContent: 'Nomes dos Jogadores', className: 'text-2xl font-bold mb-6 text-center' }),
            createComponent('form', { id: 'playerNamesForm' }, [
                createComponent('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-4' }, nameInputs),
                createComponent('button', { type: 'submit', className: 'mt-6 w-full bg-green-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-700 transition-colors', textContent: 'Iniciar Torneio' })
            ])
        ]);
    }

    function createTournamentView() {
        const { roundNumber, currentRoundPlayers } = state;
        const matches = [];
        const matchComponents = [];

        for (let i = 0; i < currentRoundPlayers.length; i += 2) {
            if (i + 1 < currentRoundPlayers.length) {
                const p1 = currentRoundPlayers[i];
                const p2 = currentRoundPlayers[i + 1];
                matches.push([p1, p2]);
                matchComponents.push(
                    createComponent('div', { className: 'bg-white p-4 rounded-lg shadow-sm border' }, [
                        createComponent('p', { textContent: `${p1} vs ${p2}`, className: 'font-semibold text-center mb-2' }),
                        createComponent('select', { className: 'border p-2 rounded-md mt-2 w-full bg-gray-50', required: true }, [
                            createComponent('option', { value: '', textContent: 'Selecione o vencedor' }),
                            createComponent('option', { value: p1, textContent: p1 }),
                            createComponent('option', { value: p2, textContent: p2 })
                        ])
                    ])
                );
            }
        }
        state.matches = matches;

        if (currentRoundPlayers.length % 2 !== 0) {
            const byePlayer = currentRoundPlayers[currentRoundPlayers.length - 1];
            matchComponents.push(
                createComponent('div', { className: 'bg-blue-50 p-4 rounded-lg shadow-sm border-l-4 border-blue-500' }, [
                    createComponent('p', { textContent: `${byePlayer} avançou (bye).`, className: 'font-semibold text-center' })
                ])
            );
        }
        
        return createComponent('div', { className: 'view-container' }, [
            createComponent('h2', { textContent: `Rodada ${roundNumber} - ${currentRoundPlayers.length} jogadores`, className: 'text-2xl font-semibold mb-4 text-center' }),
            createComponent('form', { id: 'matchesForm', className: 'space-y-4' }, matchComponents),
            createComponent('button', { id: 'nextRoundBtn', textContent: 'Avançar Rodada', className: 'mt-6 w-full bg-purple-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-purple-700' })
        ]);
    }

    function createResultsView() {
        const { summary, placements } = state.results;
        const formatCurrency = (val = 0) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        
        const rows = placements.map(({ rank, name, prize }) => 
            createComponent('tr', {}, [
                createComponent('td', { textContent: `${rank}º Lugar`, className: 'border p-2 font-bold' }),
                createComponent('td', { textContent: name, className: 'border p-2' }),
                createComponent('td', { textContent: formatCurrency(prize), className: 'border p-2' })
            ])
        );

        return createComponent('div', { className: 'view-container text-center bg-white p-6 rounded-lg shadow-md' }, [
            createComponent('h2', { textContent: '🏆 Resultados Finais 🏆', className: 'text-3xl font-bold text-green-600 mb-4' }),
            createComponent('table', { className: 'w-full border-collapse mb-6' }, [
                createComponent('thead', { className: 'bg-gray-200' }, [
                    createComponent('tr', {}, [
                        createComponent('th', { textContent: 'Colocação', className: 'border p-2' }),
                        createComponent('th', { textContent: 'Jogador', className: 'border p-2' }),
                        createComponent('th', { textContent: 'Prêmio (R$)', className: 'border p-2' })
                    ])
                ]),
                createComponent('tbody', {}, rows)
            ]),
            createComponent('button', { id: 'resetBtn', textContent: 'Novo Torneio', className: 'mt-6 bg-red-600 text-white p-3 rounded-md hover:bg-red-700 font-bold' })
        ]);
    }

    // =================================================================================
    // EVENTOS (HANDLERS)
    // =================================================================================
    function addEventListeners() {
        const configForm = document.getElementById('configForm');
        if (configForm) configForm.addEventListener('submit', handleConfigSubmit);

        const playerNamesForm = document.getElementById('playerNamesForm');
        if (playerNamesForm) playerNamesForm.addEventListener('submit', handlePlayerNamesSubmit);

        const nextRoundBtn = document.getElementById('nextRoundBtn');
        if (nextRoundBtn) nextRoundBtn.addEventListener('click', handleNextRound);
        
        const resetBtn = document.getElementById('resetBtn');
        if (resetBtn) resetBtn.addEventListener('click', handleReset);
    }

    function handleConfigSubmit(event) {
        event.preventDefault();
        const form = event.target;
        state.config.numPlayers = parseInt(form.querySelector('#numPlayers').value);
        state.config.inscricao = parseFloat(form.querySelector('#inscricao').value);
        state.view = 'playerNames';
        render();
    }
    
    function handlePlayerNamesSubmit(event) {
        event.preventDefault();
        const inputs = Array.from(event.target.querySelectorAll('input'));
        state.players = inputs.map((input, i) => input.value.trim() || `Jogador ${i + 1}`);
        state.currentRoundPlayers = shuffleArray([...state.players]);
        state.view = 'tournament';
        render();
    }

    function handleNextRound() {
        const selects = Array.from(document.querySelectorAll('#matchesForm select'));
        const winners = selects.map(s => s.value);
        if (winners.some(w => w === '')) { return alert('Por favor, selecione todos os vencedores.'); }
        
        const losers = state.matches.flat().filter(player => !winners.includes(player));
        state.eliminatedByRound.push(losers);

        let nextRoundPlayers = [...winners];
        if (state.currentRoundPlayers.length % 2 !== 0) {
            nextRoundPlayers.push(state.currentRoundPlayers[state.currentRoundPlayers.length - 1]);
        }
        state.currentRoundPlayers = nextRoundPlayers;
        
        if (nextRoundPlayers.length <= 1) {
            calculateResults();
            state.view = 'results';
        } else {
            state.roundNumber++;
        }
        render();
    }
    
    function handleReset() {
        resetState();
        render();
    }
    
    // =================================================================================
    // FUNÇÕES UTILITÁRIAS
    // =================================================================================
    function createComponent(tag, options = {}, children = []) {
        const element = document.createElement(tag);
        Object.assign(element, options);
        element.append(...children);
        return element;
    }

    // =================================================================================
    // INICIALIZAÇÃO
    // =================================================================================
    function init() {
        resetState();
        render();
    }

    init();
});
