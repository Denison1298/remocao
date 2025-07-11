/**
 * NOTA: Para evitar erros com a Clipboard API, execute esta aplicação em um ambiente seguro ou localhost.
 * A Clipboard API requer um contexto seguro para funcionar corretamente.
 */

// Função para carregar scripts jsPDF e jspdf-autotable assincronamente
function loadScripts() {
    return new Promise((resolve, reject) => {
        const jsPDFScript = document.createElement('script');
        jsPDFScript.src = 'https://unpkg.com/jspdf@2.5.1/dist/jspdf.umd.min.js';
        jsPDFScript.onload = () => {
            const autoTableScript = document.createElement('script');
            autoTableScript.src = 'https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.2/dist/jspdf.plugin.autotable.min.js';
            autoTableScript.onload = resolve;
            autoTableScript.onerror = () => reject(new Error('Erro ao carregar jspdf-autotable'));
            document.head.appendChild(autoTableScript);
        };
        jsPDFScript.onerror = () => reject(new Error('Erro ao carregar jsPDF'));
        document.head.appendChild(jsPDFScript);
    });
}

let jsPDFLoaded = false;
loadScripts().then(() => {
    jsPDFLoaded = true;
    console.log('Scripts jsPDF e jspdf-autotable carregados com sucesso.');
}).catch(error => {
    console.error('Erro ao carregar scripts:', error);
    jsPDFLoaded = false;
});

// Função para carregar o ApexCharts
function loadApexCharts() {
    return new Promise((resolve, reject) => {
        const apexScript = document.createElement('script');
        apexScript.src = 'https://cdn.jsdelivr.net/npm/apexcharts@3.44.0/dist/apexcharts.min.js';
        apexScript.onload = () => {
            console.log('ApexCharts carregado com sucesso.');
            resolve();
        };
        apexScript.onerror = () => {
            console.error('Erro ao carregar ApexCharts');
            reject(new Error('Erro ao carregar ApexCharts'));
        };
        document.head.appendChild(apexScript);
    });
}

let counter = 0;
let currentAction = null;
let currentFormId = null;
let currentProtocolo = null;

// Função para sanitizar strings, removendo caracteres problemáticos
function sanitizeString(str) {
    return (str || '').replace(/[\r\n\t]+/g, ' ').trim();
}

// Função para converter data no formato DD/MM/YYYY para objeto Date
function parseDateBR(dateStr) {
    if (!dateStr || typeof dateStr !== 'string' || !dateStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) return null;
    const [day, month, year] = dateStr.split('/').map(Number);
    return new Date(year, month - 1, day);
}

// Função para gerar uma lista de cores únicas
function getUniqueColors(count) {
    const colors = [
        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
        '#FF9F40', '#E7E9ED', '#C9CBCF', '#7E57C2', '#26A69A',
        '#FF5733', '#C70039', '#900C3F', '#581845', '#2ECC71'
    ];
    return colors.slice(0, Math.min(count, colors.length));
}

// Função para exibir erro nos elementos do gráfico
function displayChartError() {
    const containers = [
        document.getElementById('graficoAtendimentosPorDia'),
        document.getElementById('graficoAtendimentosPorTecnico'),
        document.getElementById('graficoTotalPorTecnicoMensal')
    ];
    containers.forEach(container => {
        if (container) {
            container.innerHTML = '<p style="text-align: center; color: #333; font: 16px Arial;">Erro ao carregar gráfico</p>';
        }
    });
}

window.onload = async function() {
    const savedCounter = localStorage.getItem('counter');
    if (savedCounter !== null) {
        counter = parseInt(savedCounter);
        document.getElementById('counter').textContent = counter;
    }
    
    // Inicializar saudação com nome do atendente
    const nomeAtendente = localStorage.getItem('nomeAtendente') || 'Pâmela Santos';
    const saudacaoOutput = document.getElementById('text1');
    if (saudacaoOutput) {
        saudacaoOutput.value = `Olá, tudo bem? Meu nome é ${nomeAtendente} e serei responsável pelo seu atendimento.`;
    }
    
    try {
        atualizarTabelaRemocao();
        atualizarTabelaMensais();
    } catch (error) {
        console.error('Erro ao inicializar tabelas:', error);
    }
    
    try {
        await loadApexCharts();
        if (document.getElementById('tab13') && document.getElementById('tab13').classList.contains('active')) {
            atualizarDashboard();
        }
    } catch (error) {
        console.error('Erro ao carregar ApexCharts:', error);
        if (document.getElementById('tab13') && document.getElementById('tab13').classList.contains('active')) {
            displayChartError();
        }
    }
};

function increaseCounter() {
    counter++;
    document.getElementById('counter').textContent = counter;
    localStorage.setItem('counter', counter);
    launchRocket();
}

function decreaseCounter() {
    if (counter > 0) counter--;
    document.getElementById('counter').textContent = counter;
    localStorage.setItem('counter', counter);
}

function resetCounter() {
    showConfirmPopup('resetCounter');
}

function launchRocket() {
    const rocket = document.getElementById('rocket');
    if (rocket) {
        rocket.classList.add('launch');
        setTimeout(() => rocket.classList.remove('launch'), 500);
    }
}

function openTab(tabId, element) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    const tabElement = document.getElementById(tabId);
    if (tabElement) {
        tabElement.classList.add('active');
        element.classList.add('active');
    }
    
    if (tabId === 'tab13') {
        if (typeof ApexCharts !== 'undefined') {
            atualizarDashboard();
        } else {
            console.error('ApexCharts não carregado. Gráficos não podem ser exibidos.');
            displayChartError();
        }
    } else if (tabId === 'tabMensais') {
        try {
            atualizarTabelaMensais();
        } catch (error) {
            console.error('Erro ao atualizar tabela mensal:', error);
        }
    }
}

function copyToClipboard(id) {
    const element = document.getElementById(id);
    if (!element) {
        console.error(`Elemento com ID ${id} não encontrado`);
        return;
    }
    
    // Obter nome do atendente do localStorage
    const nomeAtendente = localStorage.getItem('nomeAtendente') || 'Pâmela Santos';
    
    // Gerar saudação com o nome do atendente para text1
    let text = sanitizeString(element.value);
    if (id === 'text1') {
        text = `Olá, tudo bem? Meu nome é ${nomeAtendente} e serei responsável pelo seu atendimento.`;
    }
    
    if (text.trim() === '') {
        const popup = document.getElementById('noDataToCopyPopup');
        if (popup) {
            popup.textContent = 'Não há dados para copiar!';
            popup.style.display = 'block';
            setTimeout(() => popup.style.display = 'none', 2500);
        }
        return;
    }

    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(() => {
            const popup = document.getElementById('customPopup');
            if (popup) {
                popup.textContent = 'Texto copiado com sucesso!';
                popup.style.display = 'block';
                setTimeout(() => popup.style.display = 'none', 2500);
            }
        }).catch(err => {
            console.error('Erro ao copiar com Clipboard API:', err);
            showClipboardError(text);
        });
    } else {
        console.warn('Clipboard API não disponível ou contexto não seguro');
        showClipboardError(text);
    }
}

function showClipboardError(text) {
    try {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);

        if (successful) {
            const popup = document.getElementById('customPopup');
            if (popup) {
                popup.textContent = 'Texto copiado com sucesso!';
                popup.style.display = 'block';
                setTimeout(() => popup.style.display = 'none', 2500);
            }
            return;
        } else {
            console.warn('Fallback com document.execCommand falhou');
        }
    } catch (err) {
        console.error('Erro no fallback de cópia:', err);
    }

    const popup = document.getElementById('clipboardErrorPopup');
    if (popup) {
        popup.textContent = 'Erro ao copiar. Por favor, copie manualmente.';
        popup.style.display = 'block';
        setTimeout(() => popup.style.display = 'none', 2500);
    }

    const fallbackContainer = document.getElementById('copyFallbackContainer');
    const fallbackText = document.getElementById('copyFallbackText');
    if (fallbackContainer && fallbackText) {
        fallbackText.value = text;
        fallbackContainer.style.display = 'block';
        document.getElementById('configNomesOverlay').style.display = 'block';
    }
}

function closeCopyFallback() {
    const fallbackContainer = document.getElementById('copyFallbackContainer');
    const confirmOverlay = document.getElementById('configNomesOverlay');
    if (fallbackContainer) fallbackContainer.style.display = 'none';
    if (confirmOverlay) confirmOverlay.style.display = 'none';
}

function copiarDados(formId) {
    const suffix = formId === 'remo' ? '' : formId === 'remo2' ? '2' : formId === 'remo3' ? '3' : formId === 'remo4' ? '4' : '5';
    const protocolo = sanitizeString(document.getElementById(`protocolo${suffix}`).value);
    const tecnico = sanitizeString(document.getElementById(`tecnico${suffix}`).value);
    const codigo = sanitizeString(document.getElementById(`codigo${suffix}`).value);
    const cliente = sanitizeString(document.getElementById(`cliente${suffix}`).value);
    const CTO = sanitizeString(document.getElementById(`CTO${suffix}`).value);
    const portaRemovida = sanitizeString(document.getElementById(`portaremovida${suffix}`).value);
    const observacao = sanitizeString(document.getElementById(`observacao${suffix}`).value);
    
    let portasText = '';
    for (let i = 1; i <= 16; i++) {
        const codigoPorta = sanitizeString(document.getElementById(`porta${i}-codigo${suffix}`).value);
        const statusPorta = sanitizeString(document.getElementById(`porta${i}-status${suffix}`).value);
        if (codigoPorta || statusPorta) {
            portasText += `P${i}: ${codigoPorta || ''} - ${statusPorta || ''}\n`;
        }
    }
    
    // Obter nome do conferente do localStorage
    const nomeConferente = localStorage.getItem('nomeConferente') || 'Denison Santos';
    
    const header = `***** SEGUE A VALIDAÇÃO *****\nConferente: ${nomeConferente}\n\n`;
    const text = `${header}Protocolo: ${protocolo || ''}\nTécnico: ${tecnico || ''}\nCódigo do Cliente: ${codigo || ''}\nCliente: ${cliente || ''}\nCTO: ${CTO || ''}\nPorta Removida: ${portaRemovida || ''}\n\nObservação: ${observacao || ''}\n\nPortas:\n\n${portasText || ''}`;
    
    if (!text.trim()) {
        const popup = document.getElementById('noDataToCopyPopup');
        if (popup) {
            popup.textContent = 'Não há dados para copiar!';
            popup.style.display = 'block';
            setTimeout(() => popup.style.display = 'none', 2500);
        }
        return;
    }
    
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(() => {
            const popup = document.getElementById('customPopup');
            if (popup) {
                popup.textContent = 'Dados copiados com sucesso!';
                popup.style.display = 'block';
                setTimeout(() => popup.style.display = 'none', 2500);
            }
        }).catch(err => {
            console.error('Erro ao copiar com Clipboard API:', err);
            showClipboardError(text);
        });
    } else {
        console.warn('Clipboard API não disponível ou contexto não seguro');
        showClipboardError(text);
    }
}

function showConfirmPopup(action, formId = null, protocolo = null) {
    currentAction = action;
    currentFormId = formId;
    currentProtocolo = protocolo;

    const tabNames = {
        'remo': 'Remoção de Portas 1',
        'remo2': 'Remoção de Portas 2',
        'remo3': 'Remoção de Portas 3',
        'remo4': 'Remoção de Portas 4',
        'remo5': 'Remoção de Portas 5',
        'clearAll': 'Dados Remoção de Portas',
        'clearAllMensais': 'Atendimentos Mensais'
    };
    
    const tabName = formId ? tabNames[formId] || 'este formulário' : 'este registro';
    
    let title, text;
    switch (action) {
        case 'formClear':
            title = 'Tem certeza?';
            text = `Você deseja apagar todos os dados do formulário ${tabName}?`;
            break;
        case 'clearAll':
            title = 'Tem certeza?';
            text = `Você deseja limpar todos os dados da aba ${tabName}?`;
            break;
        case 'clearAllMensais':
            title = 'Tem certeza?';
            text = `Você deseja limpar todos os dados da aba ${tabName}?`;
            break;
        case 'resetCounter':
            title = 'Tem certeza?';
            text = 'Você deseja zerar o contador?';
            break;
        case 'deleteRecord':
        case 'deleteRecordMensais':
            title = 'Tem certeza?';
            text = 'Você deseja excluir este registro?';
            break;
        default:
            title = 'Confirmação';
            text = 'Deseja prosseguir com esta ação?';
    }

    Swal.fire({
        title: title,
        text: text,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sim, confirmar!',
        cancelButtonText: 'Cancelar',
        buttonsStyling: true,
        customClass: {
            confirmButton: 'swal-confirm-button',
            cancelButton: 'swal-cancel-button'
        }
    }).then((result) => {
        if (result.isConfirmed) {
            confirmAction();
        } else {
            Swal.fire({
                title: 'Cancelado',
                text: 'Ação cancelada.',
                icon: 'info',
                confirmButtonText: 'OK',
                customClass: {
                    confirmButton: 'swal-confirm-button'
                }
            });
            cancelAction();
        }
    });
}

function confirmAction() {
    if (currentAction === 'formClear') {
        apagarDados(currentFormId);
    } else if (currentAction === 'clearAll' || currentAction === 'clearAllMensais') {
        limparLocalStorageRemocao();
        atualizarTabelaMensais();
        atualizarDashboard();
    } else if (currentAction === 'resetCounter') {
        counter = 0;
        document.getElementById('counter').textContent = counter;
        localStorage.setItem('counter', counter);
    } else if (currentAction === 'deleteRecord' || currentAction === 'deleteRecordMensais') {
        let dados = JSON.parse(localStorage.getItem('dadosRemocao') || '[]');
        dados = dados.filter(d => d.protocolo !== currentProtocolo);
        localStorage.setItem('dadosRemocao', JSON.stringify(dados));
        decreaseCounter();
        atualizarTabelaRemocao();
        atualizarTabelaMensais();
        atualizarDashboard();
        const popup = document.getElementById('deleteSuccessPopup');
        if (popup) {
            popup.style.display = 'block';
            setTimeout(() => popup.style.display = 'none', 2500);
        }
    }
    Swal.fire({
        title: 'Sucesso!',
        text: 'Ação realizada com sucesso!',
        icon: 'success',
        confirmButtonText: 'OK',
        customClass: {
            confirmButton: 'swal-confirm-button'
        }
    });
    cancelAction();
}

function cancelAction() {
    currentAction = null;
    currentFormId = null;
    currentProtocolo = null;
}

function apagarDados(formId) {
    const suffix = formId === 'remo' ? '' : formId === 'remo2' ? '2' : formId === 'remo3' ? '3' : formId === 'remo4' ? '4' : '5';
    const protocolo = document.getElementById(`protocolo${suffix}`);
    if (!protocolo || !protocolo.value) {
        const popup = document.getElementById('noDataToCopyPopup');
        if (popup) {
            popup.textContent = 'Não há itens para apagar!';
            popup.style.display = 'block';
            setTimeout(() => popup.style.display = 'none', 2500);
        }
        return;
    }

    document.getElementById(`protocolo${suffix}`).value = '';
    document.getElementById(`tecnico${suffix}`).value = '';
    document.getElementById(`codigo${suffix}`).value = '';
    document.getElementById(`cliente${suffix}`).value = '';
    document.getElementById(`CTO${suffix}`).value = '';
    document.getElementById(`portaremovida${suffix}`).value = '';
    document.getElementById(`observacao${suffix}`).value = '';
    for (let i = 1; i <= 16; i++) {
        document.getElementById(`porta${i}-codigo${suffix}`).value = '';
        document.getElementById(`porta${i}-status${suffix}`).value = '';
    }
    const popup = document.getElementById('deleteSuccessPopup');
    if (popup) {
        popup.style.display = 'block';
        setTimeout(() => popup.style.display = 'none', 2500);
    }
}

function salvarDados(formId) {
    const suffix = formId === 'remo' ? '' : formId === 'remo2' ? '2' : formId === 'remo3' ? '3' : formId === 'remo4' ? '4' : '5';
    const tipo = formId === 'remo' ? 'R1' : formId === 'remo2' ? 'R2' : formId === 'remo3' ? 'R3' : formId === 'remo4' ? 'R4' : 'R5';
    const protocolo = sanitizeString(document.getElementById(`protocolo${suffix}`).value);
    if (!protocolo) {
        const popup = document.getElementById('emptyProtocolPopup');
        if (popup) {
            popup.style.display = 'block';
            setTimeout(() => popup.style.display = 'none', 2500);
        }
        return;
    }
    let dados = JSON.parse(localStorage.getItem('dadosRemocao') || '[]');
    if (dados.some(d => d.protocolo === protocolo)) {
        const popup = document.getElementById('errorPopup');
        if (popup) {
            popup.style.display = 'block';
            setTimeout(() => popup.style.display = 'none', 2500);
        }
        return;
    }
    const dataAtual = new Date().toLocaleDateString('pt-BR');
    const tecnico = sanitizeString(document.getElementById(`tecnico${suffix}`).value);
    const codigo = sanitizeString(document.getElementById(`codigo${suffix}`).value);
    const cliente = sanitizeString(document.getElementById(`cliente${suffix}`).value);
    const CTO = sanitizeString(document.getElementById(`CTO${suffix}`).value);
    const portaRemovida = sanitizeString(document.getElementById(`portaremovida${suffix}`).value);
    const observacao = sanitizeString(document.getElementById(`observacao${suffix}`).value);
    const portas = [];
    for (let i = 1; i <= 16; i++) {
        const codigoPorta = sanitizeString(document.getElementById(`porta${i}-codigo${suffix}`).value);
        const statusPorta = sanitizeString(document.getElementById(`porta${i}-status${suffix}`).value);
        if (codigoPorta || statusPorta) {
            portas.push({ porta: `P${i}`, codigo: codigoPorta, status: statusPorta });
        }
    }
    const novoDado = { data: dataAtual, tipo, protocolo, tecnico, codigo, cliente, CTO, portaRemovida, observacao, portas };
    dados.push(novoDado);
    localStorage.setItem('dadosRemocao', JSON.stringify(dados));
    increaseCounter();
    atualizarTabelaRemocao();
    atualizarTabelaMensais();
    atualizarDashboard();
    const popup = document.getElementById('customPopup');
    if (popup) {
        popup.textContent = 'Dados salvos com sucesso!';
        popup.style.display = 'block';
        setTimeout(() => popup.style.display = 'none', 2500);
    }
}

function atualizarTabelaRemocao() {
    const tbody = document.querySelector('#dadosTableRemocao tbody');
    if (!tbody) {
        console.error('Tabela de remoção não encontrada');
        return;
    }
    
    let dados = [];
    try {
        const storedData = localStorage.getItem('dadosRemocao');
        dados = storedData ? JSON.parse(storedData) : [];
        if (!Array.isArray(dados)) throw new Error('Dados inválidos');
    } catch (error) {
        console.error('Erro ao carregar dados de remoção:', error);
        dados = [];
    }
    
    const totalGeral = document.getElementById('totalGeralRemocao');
    if (totalGeral) {
        totalGeral.textContent = dados.length;
    }
    
    tbody.innerHTML = '';
    
    if (dados.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = '<td colspan="9" style="text-align: center;">Nenhum dado disponível</td>';
        tbody.appendChild(tr);
        return;
    }
    
    dados.forEach((item, index) => {
        if (!item) return;
        
        const tr = document.createElement('tr');
        const portasText = Array.isArray(item.portas) 
            ? item.portas.map(p => `P${p.porta}: ${p.codigo || ''} - ${p.status || ''}`).join('<br>')
            : '';
        
        tr.innerHTML = `
            <td>${sanitizeString(item.data) || ''}</td>
            <td>${sanitizeString(item.codigo) || ''}</td>
            <td>${sanitizeString(item.protocolo) || ''}</td>
            <td>${sanitizeString(item.tecnico) || ''}</td>
            <td>${sanitizeString(item.CTO) || ''}</td>
            <td>${sanitizeString(item.portaRemovida) || ''}</td>
            <td>${sanitizeString(item.observacao) || ''}</td>
            <td>${portasText}</td>
            <td>
                <button class="delete-button" onclick="showConfirmPopup('deleteRecord', null, '${sanitizeString(item.protocolo)}')">Excluir</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function excluirRegistroRemocao(protocolo) {
    showConfirmPopup('deleteRecord', null, protocolo);
}

function limparLocalStorageRemocao() {
    localStorage.removeItem('dadosRemocao');
    counter = 0;
    document.getElementById('counter').textContent = counter;
    localStorage.setItem('counter', counter);
    atualizarTabelaRemocao();
    atualizarTabelaMensais();
    atualizarDashboard();
    const popup = document.getElementById('deleteSuccessPopup');
    if (popup) {
        popup.style.display = 'block';
        setTimeout(() => popup.style.display = 'none', 2500);
    }
}

function formatDateForFilename() {
    const date = new Date();
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
}

function gerarRelatorioPDFRemocao() {
    if (!jsPDFLoaded) {
        alert('Erro: jsPDF não foi carregado. Verifique sua conexão com a internet.');
        return;
    }
    try {
        const dados = JSON.parse(localStorage.getItem('dadosRemocao') || '[]');
        if (dados.length === 0) {
            const popup = document.getElementById('noDataPopup');
            if (popup) {
                popup.style.display = 'block';
                setTimeout(() => popup.style.display = 'none', 2500);
            }
            return;
        }
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'landscape' });
        doc.setFontSize(16);
        doc.text('Relatório de Remoção', 10, 10);
        const groupedData = dados.reduce((acc, curr) => {
            acc[curr.data] = acc[curr.data] || [];
            acc[curr.data].push(curr);
            return acc;
        }, {});
        let startY = 20;
        Object.keys(groupedData).sort((a, b) => (parseDateBR(a) || new Date(0)) - (parseDateBR(b) || new Date(0))).forEach(data => {
            doc.setFontSize(12);
            doc.text(`Data: ${sanitizeString(data) || 'N/A'}`, 10, startY);
            startY += 10;
            const tableData = groupedData[data].map(d => [
                sanitizeString(d.protocolo) || 'N/A',
                sanitizeString(d.tecnico) || 'N/A',
                sanitizeString(d.codigo) || 'N/A',
                sanitizeString(d.CTO) || 'N/A',
                sanitizeString(d.portaRemovida) || 'N/A',
                sanitizeString(d.observacao) || 'N/A',
                Array.isArray(d.portas) ? d.portas.map(p => `${p.porta}: ${sanitizeString(p.codigo) || 'N/A'} - ${sanitizeString(p.status) || 'Nenhum'}`).join('\n') : 'Nenhuma'
            ]);
            doc.autoTable({
                head: [['Protocolo', 'Técnico', 'Código', 'CTO', 'Porta Removida', 'Observação', 'Portas']],
                body: tableData,
                startY: startY,
                styles: { fontSize: 8, cellPadding: 2 },
                columnStyles: {
                    0: { cellWidth: 30 },
                    1: { cellWidth: 30 },
                    2: { cellWidth: 40 },
                    3: { cellWidth: 30 },
                    4: { cellWidth: 30 },
                    5: { cellWidth: 60 },
                    6: { cellWidth: 80 }
                }
            });
            startY = doc.autoTable.previous.finalY + 10;
        });
        const filename = `Relatório Remoção - ${formatDateForFilename()}.pdf`;
        doc.save(filename);
        const popup = document.getElementById('reportSuccessPopup');
        if (popup) {
            popup.style.display = 'block';
            setTimeout(() => popup.style.display = 'none', 2500);
        }
    } catch (error) {
        console.error('Erro ao gerar PDF:', error);
    }
}

function getDadosFiltrados(periodo) {
    try {
        const dados = JSON.parse(localStorage.getItem('dadosRemocao') || '[]');
        console.log('Dados do localStorage:', JSON.stringify(dados, null, 2));
        if (periodo === 'all') return dados;
        
        const hoje = new Date();
        const limite = new Date(hoje);
        limite.setDate(hoje.getDate() - parseInt(periodo));
        
        return dados.filter(dado => {
            if (!dado || !dado.data) return false;
            const [dia, mes, ano] = dado.data.split('/').map(Number);
            if (isNaN(dia) || isNaN(mes) || isNaN(ano)) return false;
            const dataDado = new Date(ano, mes - 1, dia);
            return dataDado >= limite && dataDado <= hoje;
        });
    } catch (error) {
        console.error('Erro ao filtrar dados:', error);
        return [];
    }
}

function atualizarTabelaMensais() {
    console.log('Iniciando atualizarTabelaMensais at', new Date().toLocaleString());
    try {
        const table = document.getElementById('atendimentosMensaisTable');
        if (!table) {
            console.error('Tabela com ID "atendimentosMensaisTable" não encontrada');
            return;
        }
        const tbody = table.querySelector('tbody');
        if (!tbody) {
            console.error('Elemento tbody não encontrado em atendimentosMensaisTable');
            return;
        }
        tbody.innerHTML = '';

        const dados = JSON.parse(localStorage.getItem('dadosRemocao') || '[]');
        console.log('Dados para tabela mensal:', JSON.stringify(dados, null, 2));

        if (!Array.isArray(dados) || dados.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="5" style="text-align: center;">Sem dados para exibir</td>';
            tbody.appendChild(row);
            console.log('Nenhum dado disponível para tabela mensal');
            return;
        }

        dados.forEach((dado, index) => {
            if (!dado || typeof dado !== 'object') {
                console.warn(`Registro inválido no índice ${index}:`, dado);
                return;
            }
            const qtdPortas = Array.isArray(dado.portas) ? dado.portas.filter(p => p && (p.codigo || p.status)).length : 0;
            const protocolo = sanitizeString(dado.protocolo) || 'N/A';
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${sanitizeString(dado.data) || 'N/A'}</td>
                <td>${sanitizeString(dado.tecnico) || 'N/A'}</td>
                <td>${protocolo}</td>
                <td>${qtdPortas}</td>
                <td><button class="delete-button" onclick="showConfirmPopup('deleteRecordMensais', null, '${protocolo}')">Excluir</button></td>
            `;
            tbody.appendChild(row);
        });
        console.log('Tabela de atendimentos mensais atualizada');
    } catch (error) {
        console.error('Erro ao atualizar tabela mensal:', error);
        const table = document.getElementById('atendimentosMensaisTable');
        if (table) {
            const tbody = table.querySelector('tbody');
            if (tbody) {
                tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Erro ao carregar dados</td></tr>';
            }
        }
    }
}

function atualizarDashboard() {
    console.log('Iniciando atualizarDashboard at', new Date().toLocaleString());

    if (typeof ApexCharts === 'undefined') {
        console.error('ApexCharts não está carregado. Verifique a conexão com o CDN.');
        displayChartError();
        return;
    }

    const filtroPeriodo = document.getElementById('filtroPeriodo');
    const totalAtendimentos = document.getElementById('totalAtendimentos');
    const containerDia = document.getElementById('graficoAtendimentosPorDia');
    const containerTecnico = document.getElementById('graficoAtendimentosPorTecnico');
    const containerMensal = document.getElementById('graficoTotalPorTecnicoMensal');

    if (!filtroPeriodo || !totalAtendimentos || !containerDia || !containerTecnico || !containerMensal) {
        console.error('Elementos do dashboard não encontrados:', {
            filtroPeriodo: !!filtroPeriodo,
            totalAtendimentos: !!totalAtendimentos,
            containerDia: !!containerDia,
            containerTecnico: !!containerTecnico,
            containerMensal: !!containerMensal
        });
        displayChartError();
        return;
    }

    const periodo = filtroPeriodo.value || 'all';
    console.log('Período selecionado:', periodo);

    let dados;
    try {
        dados = getDadosFiltrados(periodo);
        console.log('Dados filtrados:', JSON.stringify(dados, null, 2));
    } catch (error) {
        console.error('Erro ao obter dados filtrados:', error);
        displayChartError();
        return;
    }

    totalAtendimentos.textContent = (dados || []).length;

    const displayNoData = (container) => {
        if (container) {
            container.innerHTML = '<p style="text-align: center; color: #333; font: 16px Arial;">Sem dados para exibir</p>';
            console.log('Exibindo mensagem de sem dados para:', container.id);
        }
    };

    if (!dados || !Array.isArray(dados) || dados.length === 0) {
        console.log('Nenhum dado disponível para gráficos');
        [containerDia, containerTecnico, containerMensal].forEach(displayNoData);
        return;
    }

    // Gráfico: Atendimentos por Dia
    try {
        const atendimentosPorDia = dados.reduce((acc, d) => {
            if (d && d.data && typeof d.data === 'string' && d.data.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
                acc[d.data] = (acc[d.data] || 0) + 1;
            } else {
                console.warn('Registro ignorado devido a data inválida:', d);
            }
            return acc;
        }, {});

        const datas = Object.keys(atendimentosPorDia).sort((a, b) => {
            const dateA = parseDateBR(a) || new Date(0);
            const dateB = parseDateBR(b) || new Date(0);
            return dateA - dateB;
        });
        console.log('Datas ordenadas:', datas);
        console.log('Atendimentos por dia:', atendimentosPorDia);

        containerDia.innerHTML = '';
        new ApexCharts(containerDia, {
            chart: {
                type: 'bar',
                height: 200,
                toolbar: { show: false }
            },
            series: [{
                name: 'Atendimentos',
                data: datas.length ? datas.map(d => atendimentosPorDia[d] || 0) : [0]
            }],
            xaxis: {
                categories: datas.length ? datas : ['Sem data'],
                labels: { rotate: -45 }
            },
            yaxis: {
                min: 0,
                forceNiceScale: true,
                labels: { formatter: val => Math.floor(val) }
            },
            colors: ['#FF6384'],
            title: { text: 'Atendimentos por Dia', align: 'center' }
        }).render();
        console.log('Gráfico de atendimentos por dia criado');
    } catch (error) {
        console.error('Erro ao criar gráfico de atendimentos por dia:', error);
        displayNoData(containerDia);
    }

    // Gráfico: Atendimentos por Técnico (Diário)
    try {
        // Obter lista única de técnicos válidos
        const tecnicos = [...new Set(dados
            .filter(d => d && d.tecnico && typeof d.tecnico === 'string' && d.tecnico.trim())
            .map(d => d.tecnico.trim()))];
        console.log('Técnicos encontrados:', tecnicos);

        // Obter todas as datas válidas
        const datas = [...new Set(dados
            .filter(d => d && d.data && typeof d.data === 'string' && d.data.match(/^\d{2}\/\d{2}\/\d{4}$/))
            .map(d => d.data))]
            .sort((a, b) => {
                const dateA = parseDateBR(a) || new Date(0);
                const dateB = parseDateBR(b) || new Date(0);
                return dateA - dateB;
            });
        console.log('Datas para gráfico por técnico:', datas);

        // Criar séries de dados: uma série por técnico
        const seriesData = tecnicos.map(tecnico => {
            const data = datas.map(data => {
                const count = dados.filter(d => 
                    d && d.data === data && 
                    d.tecnico && d.tecnico.trim() === tecnico
                ).length;
                return count;
            });
            return { name: tecnico, data };
        });

        console.log('Séries para atendimentos por técnico:', JSON.stringify(seriesData, null, 2));

        // Verificar se há dados válidos
        if (seriesData.length === 0 || datas.length === 0) {
            console.log('Nenhum dado válido para gráfico por técnico');
            displayNoData(containerTecnico);
            return;
        }

        containerTecnico.innerHTML = '';
        new ApexCharts(containerTecnico, {
            chart: {
                type: 'bar',
                height: 200,
                stacked: true,
                toolbar: { show: false }
            },
            series: seriesData,
            xaxis: {
                categories: datas,
                labels: { rotate: -45 }
            },
            yaxis: {
                min: 0,
                forceNiceScale: true,
                labels: { formatter: val => Math.floor(val) }
            },
            colors: tecnicos.length ? getUniqueColors(tecnicos.length) : ['#36A2EB'],
            title: { text: 'Atendimentos por Técnico (Diário)', align: 'center' },
            legend: { position: 'top' }
        }).render();
        console.log('Gráfico de atendimentos por técnico criado');
    } catch (error) {
        console.error('Erro ao criar gráfico de atendimentos por técnico:', error);
        displayNoData(containerTecnico);
    }

    // Gráfico: Total por Técnico (Mensal)
    try {
        const porMes = dados.reduce((acc, d) => {
            if (d && d.data && typeof d.data === 'string' && d.data.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
                const parts = d.data.split('/');
                if (parts.length === 3) {
                    const [, mes, ano] = parts.map(Number);
                    const key = `${mes.toString().padStart(2, '0')}/${ano}`;
                    acc[key] = acc[key] || {};
                    if (d.tecnico && typeof d.tecnico === 'string' && d.tecnico.trim()) {
                        acc[key][d.tecnico.trim()] = (acc[key][d.tecnico.trim()] || 0) + 1;
                    }
                }
            }
            return acc;
        }, {});

        const meses = Object.keys(porMes).sort((a, b) => {
            const [ma, ya] = a.split('/').map(Number);
            const [mb, yb] = b.split('/').map(Number);
            return new Date(yb, mb - 1) - new Date(ya, ma - 1);
        });

        const ultimoMes = meses[0] || 'Sem mês';
        console.log('Último mês:', ultimoMes, 'Dados mensal:', porMes);

        const tecnicos = [...new Set(dados
            .filter(d => d && d.tecnico && typeof d.tecnico === 'string' && d.tecnico.trim())
            .map(d => d.tecnico.trim()))];
        const dataMes = tecnicos.length && porMes[ultimoMes] ? tecnicos.map(t => porMes[ultimoMes][t] || 0) : [0];
        console.log('Dados para gráfico mensal:', dataMes);

        containerMensal.innerHTML = '';
        new ApexCharts(containerMensal, {
            chart: {
                type: 'pie',
                height: 200
            },
            series: dataMes,
            labels: tecnicos.length ? tecnicos : ['Nenhum técnico'],
            colors: tecnicos.length ? getUniqueColors(tecnicos.length) : ['#FFCE56'],
            title: { text: `Total por Técnico (${ultimoMes})`, align: 'center' },
            legend: { position: 'top' }
        }).render();
        console.log('Gráfico mensal por técnico criado');
    } catch (error) {
        console.error('Erro ao criar gráfico mensal por técnico:', error);
        displayNoData(containerMensal);
    }
}

// Função para abrir o popup de configuração de nomes
function showConfigNomesPopup() {
    const nomeConferente = localStorage.getItem('nomeConferente') || 'Pâmela Santos';
    const nomeAtendente = localStorage.getItem('nomeAtendente') || 'Pâmela Santos';
    
    const inputConferente = document.getElementById('nomeConferente');
    const inputAtendente = document.getElementById('nomeAtendente');
    
    if (inputConferente) inputConferente.value = nomeConferente;
    if (inputAtendente) inputAtendente.value = nomeAtendente;
    
    const popup = document.getElementById('configNomesPopup');
    const overlay = document.getElementById('configNomesOverlay');
    if (popup) popup.style.display = 'block';
    if (overlay) overlay.style.display = 'block';
}

// Função para salvar os nomes configurados
function saveNomesConfig() {
    const inputConferente = document.getElementById('nomeConferente');
    const inputAtendente = document.getElementById('nomeAtendente');
    
    const nomeConferente = sanitizeString(inputConferente ? inputConferente.value : '') || 'Pâmela Santos';
    const nomeAtendente = sanitizeString(inputAtendente ? inputAtendente.value : '') || 'Pâmela Santos';
    
    localStorage.setItem('nomeConferente', nomeConferente);
    localStorage.setItem('nomeAtendente', nomeAtendente);
    
    // Atualizar o textarea de saudação com o novo nome
    const saudacaoOutput = document.getElementById('text1');
    if (saudacaoOutput) {
        saudacaoOutput.value = `Olá, tudo bem? Meu nome é ${nomeAtendente} e serei responsável pelo seu atendimento.`;
    }
    
    closeConfigNomesPopup();
    
    const popup = document.getElementById('customPopup');
    if (popup) {
        popup.textContent = 'Nomes salvos com sucesso!';
        popup.style.display = 'block';
        setTimeout(() => popup.style.display = 'none', 2500);
    }
}

// Função para fechar o popup de configuração
function closeConfigNomesPopup() {
    const popup = document.getElementById('configNomesPopup');
    const overlay = document.getElementById('configNomesOverlay');
    if (popup) popup.style.display = 'none';
    if (overlay) overlay.style.display = 'none';
}
