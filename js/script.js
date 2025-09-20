document.addEventListener('DOMContentLoaded', () => {
    'use strict';

    // =================================================================================
    // ESTADO DA APLICAÇÃO
    // =================================================================================
    let state = {};

    function resetState() {
        state = {
            view: 'config',
            players: [],
            currentRoundPlayers: [],
            roundNumber: 1,
            eliminatedByRound: [],
            matches: [],
            config: {
                numPlayers: 8,
                inscricao: 10,
                orgPercent: 20,
                prizePercentages: [50, 30, 20], // Soma 100% do prêmio
            },
            results: null,
        };
    }

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
    // RENDERIZAÇÃO E COMPONENTES
    // =================================================================================
    function render() {
        appContainer.innerHTML = '';
        let viewComponent;
        switch (state.view) {
            case 'playerNames': viewComponent = createPlayerNamesView(); break;
            case 'tournament': viewComponent = createTournamentView(); break;
            case 'results': viewComponent = createResultsView(); break;
            default: viewComponent = createConfigView(); break;
        }
        appContainer.append(viewComponent);
        addEventListeners();
        if (state.view === 'config') validatePercentages();
    }

    function createConfigView() {
        const prizeInputs = state.config.prizePercentages.map((percentage, index) => {
            return createComponent('div', { className: 'flex items-center gap-2' }, [
                createComponent('label', { htmlFor: `prize${index}`, textContent: `${index + 1}º Lugar (%):`, className: 'w-28 text-sm text-slate-600' }),
                createComponent('input', { type: 'number', id: `prize${index}`, value: percentage, className: 'prize-distribution-input border p-2 w-full rounded-md', min: 0 }),
                createComponent('button', { type: 'button', textContent: '−', className: 'remove-prize-btn bg-red-500 text-white font-bold w-8 h-8 rounded-full hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed', dataset: { index }, disabled: state.config.prizePercentages.length <= 1 })
            ]);
        });
        
        return createComponent('div', { className: 'view-container bg-white p-6 md:p-8 rounded-xl shadow-lg' }, [
            createComponent('h2', { textContent: 'Etapa 1: Configurações Iniciais', className: 'text-2xl font-bold mb-6 text-center' }),
            createComponent('form', { id: 'configForm', className: 'space-y-6' }, [
                createComponent('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-6' }, [
                    createComponent('div', {}, [
                        createComponent('label', { htmlFor: 'numPlayers', textContent: 'Jogadores (mín. 2):', className: 'block font-medium mb-1' }),
                        createComponent('input', { type: 'number', id: 'numPlayers', min: 2, value: state.config.numPlayers, className: 'border p-2 w-full rounded-md', required: true })
                    ]),
                    createComponent('div', {}, [
                        createComponent('label', { htmlFor: 'inscricao', textContent: 'Inscrição (R$):', className: 'block font-medium mb-1' }),
                        createComponent('input', { type: 'number', id: 'inscricao', min: 0, step: '0.01', value: state.config.inscricao, className: 'border p-2 w-full rounded-md', required: true })
                    ]),
                ]),
                createComponent('hr'),
                createComponent('div', {}, [
                     createComponent('h3', { textContent: 'Taxa da Organização', className: 'text-lg font-semibold mb-2' }),
                     createComponent('input', { type: 'number', id: 'orgPercent', min: 0, max: 100, value: state.config.orgPercent, className: 'border p-2 w-full rounded-md', required: true }),
                ]),
                createComponent('hr'),
                createComponent('div', {}, [
                    createComponent('h3', { textContent: 'Distribuição dos Prêmios (deve somar 100%)', className: 'text-lg font-semibold mb-2' }),
                    ...prizeInputs,
                    createComponent('button', { type: 'button', id: 'add-prize-btn', textContent: '+ Adicionar Posição', className: 'mt-2 w-full bg-slate-200 text-slate-700 font-semibold py-2 px-4 rounded-lg hover:bg-slate-300' })
                ]),
                createComponent('div', { id: 'percentage-feedback', className: 'mt-4 text-center font-semibold p-2 rounded-md' }),
                createComponent('button', { type: 'submit', id: 'submit-config', className: 'w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-slate-400', textContent: 'Confirmar e Inserir Nomes' })
            ])
        ]);
    }
    
    function createPlayerNamesView() {
        const nameInputs = Array.from({ length: state.config.numPlayers }, (_, i) =>
            createComponent('input', { type: 'text', placeholder: `Nome do Jogador ${i + 1}`, className: 'border p-2 w-full rounded-md' })
        );
        return createComponent('div', { className: 'view-container bg-white p-6 md:p-8 rounded-xl shadow-lg' }, [
            createComponent('h2', { textContent: 'Etapa 2: Nomes dos Jogadores', className: 'text-2xl font-bold mb-6 text-center' }),
            createComponent('form', { id: 'playerNamesForm' }, [
                createComponent('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-4' }, nameInputs),
                createComponent('button', { type: 'submit', className: 'mt-6 w-full bg-green-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-700 transition-colors', textContent: 'Embaralhar e Iniciar Torneio' })
            ])
        ]);
    }

    function createTournamentView() {
        // ... (código existente sem alterações)
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
            createComponent('button', { id: 'nextRoundBtn', textContent: 'Confirmar Vencedores e Avançar Rodada', className: 'mt-6 w-full bg-purple-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-purple-700' })
        ]);
    }

    function createResultsView() {
        // ... (código existente com a terminologia atualizada)
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
             createComponent('div', { className: 'space-y-2 text-lg bg-gray-50 p-4 rounded-md' }, [
                createComponent('p', { textContent: `Total Apostado: ${formatCurrency(summary.totalArrecadado)}`, className: 'font-semibold' }),
                createComponent('p', { textContent: `Valor para Organização: ${formatCurrency(summary.orgValue)}`, className: 'font-medium text-blue-600' }),
                createComponent('p', { textContent: `Premiação Total Distribuída: ${formatCurrency(summary.prizePool)}`, className: 'font-bold text-green-700' })
            ]),
            createComponent('button', { id: 'resetBtn', textContent: 'Iniciar Novo Torneio', className: 'mt-6 bg-red-600 text-white p-3 rounded-md hover:bg-red-700 font-bold' })
        ]);
    }
    
    // =================================================================================
    // EVENTOS E VALIDAÇÃO
    // =================================================================================
    function addEventListeners() {
        // ... (código de adicionar listeners permanece o mesmo)
        const configForm = document.getElementById('configForm');
        if (configForm) {
            configForm.addEventListener('submit', handleConfigSubmit);
            configForm.addEventListener('click', handleConfigClicks);
            configForm.addEventListener('input', validatePercentages);
        }
        const playerNamesForm = document.getElementById('playerNamesForm');
        if (playerNamesForm) playerNamesForm.addEventListener('submit', handlePlayerNamesSubmit);
        const nextRoundBtn = document.getElementById('nextRoundBtn');
        if (nextRoundBtn) nextRoundBtn.addEventListener('click', handleNextRound);
        const resetBtn = document.getElementById('resetBtn');
        if (resetBtn) resetBtn.addEventListener('click', handleReset);
    }

    function handleConfigSubmit(event) {
        // ... (código de submit permanece o mesmo)
        event.preventDefault();
        const form = event.target;
        state.config.numPlayers = parseInt(form.querySelector('#numPlayers').value);
        state.config.inscricao = parseFloat(form.querySelector('#inscricao').value);
        state.config.orgPercent = parseFloat(form.querySelector('#orgPercent').value);
        const prizeInputs = Array.from(form.querySelectorAll('.prize-distribution-input'));
        state.config.prizePercentages = prizeInputs.map(input => parseFloat(input.value) || 0);
        state.view = 'playerNames';
        render();
    }
    
    function handleConfigClicks(event) {
        // ... (código de clicks permanece o mesmo)
        const target = event.target;
        if (target.id === 'add-prize-btn') {
            state.config.prizePercentages.push(0);
            render();
        }
        if (target.classList.contains('remove-prize-btn')) {
            const index = parseInt(target.dataset.index, 10);
            state.config.prizePercentages.splice(index, 1);
            render();
        }
    }

    function handlePlayerNamesSubmit(event) {
        // ... (código de submit de nomes permanece o mesmo)
        event.preventDefault();
        const inputs = Array.from(event.target.querySelectorAll('input'));
        state.players = inputs.map((input, i) => input.value.trim() || `Jogador ${i + 1}`);
        state.currentRoundPlayers = shuffleArray([...state.players]);
        state.view = 'tournament';
        render();
    }

    function handleNextRound() {
        // ... (código de próxima rodada permanece o mesmo)
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
        // ... (código de reset permanece o mesmo)
        resetState();
        render();
    }

    function validatePercentages() {
        const feedbackEl = document.getElementById('percentage-feedback');
        const submitBtn = document.getElementById('submit-config');
        if (!feedbackEl || !submitBtn) return;
        
        // A MUDANÇA PRINCIPAL ESTÁ AQUI: SÓ SELECIONA OS INPUTS DA PREMIAÇÃO
        const inputs = Array.from(document.querySelectorAll('.prize-distribution-input'));
        const total = inputs.reduce((sum, input) => sum + (parseFloat(input.value) || 0), 0);

        feedbackEl.textContent = `Total da Premiação Distribuída: ${total.toFixed(2)}%`;
        
        if (Math.abs(total - 100) < 0.01) { // Lida com imprecisões de ponto flutuante
            feedbackEl.className = 'mt-4 text-center font-semibold p-2 rounded-md bg-green-100 text-green-700';
            submitBtn.disabled = false;
        } else {
            feedbackEl.className = 'mt-4 text-center font-semibold p-2 rounded-md bg-red-100 text-red-700';
            const diff = (100 - total).toFixed(2);
            feedbackEl.textContent += ` (${diff > 0 ? `Faltam ${diff}` : `Sobram ${-diff}`}%)`;
            submitBtn.disabled = true;
        }
    }
    
    // =================================================================================
    // FUNÇÕES UTILITÁRIAS
    // =================================================================================
    function createComponent(tag, options = {}, children = []) {
        // ... (código de criar componente permanece o mesmo)
        const element = document.createElement(tag);
        Object.entries(options).forEach(([key, value]) => {
            if (key === 'dataset') {
                Object.entries(value).forEach(([dataKey, dataValue]) => element.dataset[dataKey] = dataValue);
            } else { element[key] = value; }
        });
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
