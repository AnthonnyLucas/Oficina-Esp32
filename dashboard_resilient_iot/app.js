/**
 * RESILIENT IOT — DASHBOARD MOTOR EM TEMPO REAL (SNCT 2026)
 * UFRPE / UABJ — Engenharia da Computação
 * Arquitetura de Simulação & Espelhamento Multiprotocolo (MQTT / LoRa)
 */

// ==========================================================================
// 1. ESTADO GLOBAL DA APLICAÇÃO
// ==========================================================================
const state = {
  isRunning: true,
  speed: 1, // 1x, 2x, 10x
  chaosActive: false, // simulação de falha no Wi-Fi
  mqttFailed: false,  // Falha na rota MQTT (Mosquitto)
  loraFailed: false,  // Falha na rota LoRaWAN (Gateway/Bridge)
  tempestadeActive: false, // Cenário de alta latência e perda de pacotes
  blackoutActive: false,   // Blackout total de comunicações
  chaosDrawerOpen: false,  // Estado do painel drawer lateral
  activeRoute: 'MQTT', // 'MQTT' (Caminho A), 'LORA' (Caminho B) ou 'NONE' (Blackout)
  currentRoute: 'dashboard',
  selectedDeviceId: 'DEV-01',
  
  // Dados do Sensor Principal DEV-01 (DHT22 no ESP32)
  sensors: {
    temp: 27.6,
    umid: 56.2,
    heatIndex: 28.9,
    lux: 59508.0,
    status: 'OK',
    lastUpdate: new Date()
  },

  // Dados do Sensor Secundário DEV-02 (DHT11 no Arduino)
  sensorsDev2: {
    temp: 26.8,
    umid: 58.0,
    lux: 390.0
  },

  // Contadores de Rede e Telemetria
  metrics: {
    totalPackets: 453,
    deliveryRate: 100.0,
    dev1Sent: 453,
    dev1Buffer: 1000,
    dev1Failures: 0,
    dev1FailuresA: 0,
    dev1Failback: 0,
    dev2Sent: 453,
    dev2Buffer: 1000,
    dev2Failures: 0,
    dev2FailuresA: 0,
    dev2Failback: 0,
    packetSeq: 453
  },

  // Dispositivos Cadastrados
  devices: {
    'DEV-01': {
      id: 'DEV-01',
      name: 'ESP32',
      model: 'ESP32 (D5: DHT22, D25-D27: LEDs)',
      boot: 'e76e1f94',
      type: 'esp32',
      defaultPath: 'MQTT'
    },
    'DEV-02': {
      id: 'DEV-02',
      name: 'ARDUINO',
      model: 'ARDUINO · UNO R4 Wi-Fi',
      boot: '3fa414fc',
      type: 'arduino',
      defaultPath: 'MQTT'
    }
  },

  // Servidores Cadastrados
  servers: {
    'SRV-01': {
      id: 'SRV-01',
      name: 'SRV-01',
      title: 'Servidor de Ingestão',
      pipeline: 'Pipeline de 5 etapas',
      status: 'ONLINE',
      received: 986,
      approved: 0,
      rejected: 986,
      deduplicated: 0,
      rate: 0.0
    }
  },
  selectedServerId: 'SRV-01',

  // Clientes Cadastrados
  clients: {
    'PC-GER-01': {
      id: 'PC-GER-01',
      name: 'Gerência',
      role: 'GERENCIA',
      server: 'SRV-01',
      status: 'CONECTADO',
      packets: 986,
      avatarClass: 'client-avatar-ger',
      badgeClass: 'normal',
      type: 'gerencia'
    },
    'PC-ANA-01': {
      id: 'PC-ANA-01',
      name: 'Analista',
      role: 'ANALISTA',
      server: 'SRV-01',
      status: 'CONECTADO',
      packets: 986,
      avatarClass: 'client-avatar-ana',
      badgeClass: 'normal',
      type: 'analista'
    },
    'PC-TEC-01': {
      id: 'PC-TEC-01',
      name: 'Técnico',
      role: 'TECNICO',
      server: 'SRV-01',
      status: 'CONECTADO',
      packets: 986,
      avatarClass: 'client-avatar-tec',
      badgeClass: 'normal',
      type: 'tecnico'
    },
    'PC-EST-01': {
      id: 'PC-EST-01',
      name: 'Estranho',
      role: 'ESTRANHO',
      server: 'SRV-01',
      status: 'ACESSO NEGADO',
      packets: 986,
      avatarClass: 'client-avatar-est',
      badgeClass: 'denied',
      type: 'estranho'
    }
  },
  selectedClientId: 'PC-GER-01',

  // Integração com ESP32 Físico / Wokwi
  realEsp: {
    connected: false,
    ip: 'http://10.0.0.175',
    timer: null
  },

  activeLogFilter: 'all',
  currentTab: 'tab-payload',
  modalOpen: false
};

// ==========================================================================
// 2. CONTROLES DE REPRODUÇÃO & TOPBAR
// ==========================================================================
const btnPlay = document.getElementById('btn-play');
const btnPause = document.getElementById('btn-pause');
const btnStop = document.getElementById('btn-stop');
const btnSpeed = document.getElementById('btn-speed');
const btnToggleChaos = document.getElementById('btn-toggle-chaos');
const speedLabel = document.getElementById('speed-label');
const currentTimestampElem = document.getElementById('current-timestamp');
const statusPill = document.getElementById('status-pill');
const statusPillText = document.getElementById('status-pill-text');

btnPlay.addEventListener('click', () => {
  state.isRunning = true;
  btnPlay.classList.add('active');
  btnPause.classList.remove('active');
  logEvent('STATE', 'Fluxo de dados e telemetria retomado pelo operador.');
});

btnPause.addEventListener('click', () => {
  state.isRunning = false;
  btnPause.classList.add('active');
  btnPlay.classList.remove('active');
  logEvent('STATE', 'Fluxo de dados pausado pelo operador.');
});

btnStop.addEventListener('click', () => {
  state.metrics.dev1Buffer = 0;
  state.metrics.dev2Buffer = 0;
  atualizarMétricasDOM();
  logEvent('STATE', 'Buffers de dispositivos esvaziados e contadores resetados.');
});

btnSpeed.addEventListener('click', () => {
  if (state.speed === 1) state.speed = 2;
  else if (state.speed === 2) state.speed = 10;
  else state.speed = 1;

  btnSpeed.textContent = state.speed + 'x';
  speedLabel.textContent = state.speed + 'x';
  logEvent('STATE', `Taxa de amostragem ajustada para ${state.speed}x`);
});

// Relógio em Tempo Real
setInterval(() => {
  const agora = new Date();
  const formatado = agora.toISOString().replace('T', ' ').substring(0, 19);
  currentTimestampElem.textContent = formatado;
}, 1000);

// ==========================================================================
// 3. CANVAS & TOPOLOGIA DE REDE (DESENHO DE ARESTAS E PARTÍCULAS)
// ==========================================================================
const canvas = document.getElementById('topology-canvas');
const ctx = canvas.getContext('2d');
const particles = [];

function redimensionarCanvas() {
  const stage = document.getElementById('topology-stage');
  canvas.width = stage.clientWidth;
  canvas.height = stage.clientHeight;
}
window.addEventListener('resize', redimensionarCanvas);
redimensionarCanvas();

// Pega o centro absoluto (x, y) relativo ao canvas de um elemento pelo ID
function getCentroElemento(id) {
  const elem = document.getElementById(id);
  if (!elem) return { x: 0, y: 0 };
  const stageRect = document.getElementById('topology-stage').getBoundingClientRect();
  const elemRect = elem.getBoundingClientRect();
  return {
    x: elemRect.left - stageRect.left + elemRect.width / 2,
    y: elemRect.top - stageRect.top + elemRect.height / 2
  };
}

// Definição das conexões da topologia (conforme as imagens do projeto SNCT)
function obterConexoes() {
  return [
    // PERCEPÇÃO -> DEV-01
    { de: 'node-temp-1', para: 'node-dev-01', cor: '#10B981', estilo: 'dash', rota: 'MQTT' },
    { de: 'node-umid-1', para: 'node-dev-01', cor: '#10B981', estilo: 'dash', rota: 'MQTT' },
    { de: 'node-lux-1',  para: 'node-dev-01', cor: '#10B981', estilo: 'dash', rota: 'MQTT' },

    // PERCEPÇÃO -> DEV-02
    { de: 'node-temp-2', para: 'node-dev-02', cor: '#10B981', estilo: 'dash', rota: 'MQTT' },
    { de: 'node-umid-2', para: 'node-dev-02', cor: '#10B981', estilo: 'dash', rota: 'MQTT' },
    { de: 'node-lux-2',  para: 'node-dev-02', cor: '#10B981', estilo: 'dash', rota: 'MQTT' },

    // DEV-01 -> PROCESSAMENTO (MQTT / LoRa)
    { de: 'node-dev-01', para: 'node-mosquitto', cor: state.mqttFailed ? '#EF4444' : '#10B981', estilo: 'dash', rota: 'MQTT' },
    { de: 'node-dev-01', para: 'node-gateway',   cor: state.loraFailed ? '#EF4444' : '#F59E0B', estilo: 'dash', rota: 'LORA' },

    // DEV-02 -> PROCESSAMENTO (MQTT / LoRa)
    { de: 'node-dev-02', para: 'node-mosquitto', cor: state.mqttFailed ? '#EF4444' : '#10B981', estilo: 'dash', rota: 'MQTT' },
    { de: 'node-dev-02', para: 'node-gateway',   cor: state.loraFailed ? '#EF4444' : '#F59E0B', estilo: 'dash', rota: 'LORA' },

    // PROCESSAMENTO INTERNO
    { de: 'node-gateway',   para: 'node-netserver', cor: state.loraFailed ? '#EF4444' : '#F59E0B', estilo: 'dash', rota: 'LORA' },
    { de: 'node-gateway',   para: 'node-bridge',    cor: state.loraFailed ? '#EF4444' : '#F59E0B', estilo: 'dash', rota: 'LORA' },
    { de: 'node-netserver', para: 'node-bridge',    cor: state.loraFailed ? '#EF4444' : '#F59E0B', estilo: 'dash', rota: 'LORA' },

    // PROCESSAMENTO -> SERVIDOR SRV-01
    { de: 'node-mosquitto', para: 'node-srv-01', cor: state.mqttFailed ? '#EF4444' : '#10B981', estilo: 'dash', rota: 'MQTT' },
    { de: 'node-bridge',    para: 'node-srv-01', cor: state.loraFailed ? '#EF4444' : '#10B981', estilo: 'dash', rota: 'LORA' },

    // SERVIDOR SRV-01 -> CLIENTES FINAIS
    { de: 'node-srv-01', para: 'node-client-gerencia', cor: '#A855F7', estilo: 'dash', rota: 'APP' },
    { de: 'node-srv-01', para: 'node-client-analista', cor: '#A855F7', estilo: 'dash', rota: 'APP' },
    { de: 'node-srv-01', para: 'node-client-tecnico',  cor: '#A855F7', estilo: 'dash', rota: 'APP' },
    { de: 'node-srv-01', para: 'node-client-estranho', cor: '#6B7280', estilo: 'dash', rota: 'APP' }
  ];
}

// Injeção de uma partícula de dados viajando entre nós
function dispararParticula(deId, paraId, cor = '#10B981') {
  const p1 = getCentroElemento(deId);
  const p2 = getCentroElemento(paraId);
  particles.push({
    x1: p1.x, y1: p1.y,
    x2: p2.x, y2: p2.y,
    progresso: 0,
    velocidade: 0.02 * state.speed,
    cor: cor,
    alvoId: paraId
  });
}

// Loop Principal de Animação do Canvas (60 FPS)
function animarTopologia() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const conexoes = obterConexoes();

  // 1. Desenha as linhas estáticas com estilo tracejado
  conexoes.forEach(c => {
    const p1 = getCentroElemento(c.de);
    const p2 = getCentroElemento(c.para);

    ctx.save();
    ctx.beginPath();
    ctx.setLineDash([4, 4]);

    // Opacidade baseada na rota ativa e estado de falha
    let alfa = 0.35;
    if (c.rota === 'MQTT' && state.mqttFailed) {
      alfa = 0.85; // Linha de falha em vermelho bem visível
    } else if (c.rota === 'LORA' && state.loraFailed) {
      alfa = 0.85; // Linha de falha em vermelho bem visível
    } else if (c.rota === state.activeRoute || c.rota === 'APP') {
      alfa = 0.75;
    } else if (state.chaosActive && c.rota === 'LORA') {
      alfa = 0.9;
    }

    ctx.strokeStyle = c.cor;
    ctx.globalAlpha = alfa;
    ctx.lineWidth = (c.cor === '#EF4444') ? 2 : 1.5;
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
    ctx.restore();
  });

  // 2. Atualiza e desenha as partículas em trânsito
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.progresso += p.velocidade;

    if (p.progresso >= 1) {
      // Chegou ao nó de destino: ativa efeito de brilho no nó
      const elemAlvo = document.getElementById(p.alvoId);
      if (elemAlvo) {
        elemAlvo.classList.add('pulse-active');
        setTimeout(() => elemAlvo.classList.remove('pulse-active'), 350);
      }
      particles.splice(i, 1);
      continue;
    }

    const curX = p.x1 + (p.x2 - p.x1) * p.progresso;
    const curY = p.y1 + (p.y2 - p.y1) * p.progresso;

    ctx.save();
    ctx.beginPath();
    ctx.arc(curX, curY, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = p.cor;
    ctx.shadowColor = p.cor;
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.restore();
  }

  requestAnimationFrame(animarTopologia);
}
requestAnimationFrame(animarTopologia);

// ==========================================================================
// 4. MOTOR DE EVENTOS DE REDE & TRANSMISSÃO (ESPELHAMENTO MQTT)
// ==========================================================================
function simularCicloDeTransmissao() {
  if (!state.isRunning) return;

  // Se não estiver conectado a um ESP32 físico, faz amostragem e leve variação realística
  if (!state.realEsp.connected) {
    // Variação browniana leve (temperatura e umidade típicas do DHT22)
    state.sensors.temp += (Math.random() - 0.49) * 0.15;
    state.sensors.temp = Math.max(24.0, Math.min(33.5, state.sensors.temp));

    state.sensors.umid += (Math.random() - 0.5) * 0.3;
    state.sensors.umid = Math.max(45.0, Math.min(85.0, state.sensors.umid));

    state.sensors.lux += Math.floor((Math.random() - 0.5) * 8);
    state.sensors.lux = Math.max(100, Math.min(950, state.sensors.lux));

    state.sensors.heatIndex = calcularSensacaoTermica(state.sensors.temp, state.sensors.umid);
    state.sensors.lastUpdate = new Date();
  }

  // 1. Partículas da Camada de Percepção para os Dispositivos DEV-01 (ESP32) e DEV-02 (Arduino)
  // A amostragem dos sensores físicos continua ocorrendo localmente mesmo em falha de rede
  dispararParticula('node-temp-1', 'node-dev-01', '#10B981');
  dispararParticula('node-umid-1', 'node-dev-01', '#38BDF8');
  dispararParticula('node-lux-1',  'node-dev-01', '#F59E0B');

  dispararParticula('node-temp-2', 'node-dev-02', '#10B981');
  dispararParticula('node-umid-2', 'node-dev-02', '#38BDF8');
  dispararParticula('node-lux-2',  'node-dev-02', '#F59E0B');

  // CENÁRIO A: BLACKOUT TOTAL (Ambas as rotas MQTT e LoRa inoperantes)
  if (state.mqttFailed && state.loraFailed) {
    // Aloca dados em Store-and-Forward local no ESP32 e Arduino UNO R4
    state.metrics.dev1Buffer = Math.min(1000, state.metrics.dev1Buffer + 1);
    state.metrics.dev2Buffer = Math.min(1000, state.metrics.dev2Buffer + 1);
    state.metrics.deliveryRate = Math.max(0.0, state.metrics.deliveryRate - 2.5);

    logEvent('ALERT', `💾 [STORE-AND-FORWARD] Rede isolada (Blackout). Retendo pacotes localmente (DEV-01: ${state.metrics.dev1Buffer}/1000 | DEV-02: ${state.metrics.dev2Buffer}/1000)`);
    atualizarMétricasDOM();
    if (state.modalOpen) atualizarModalDOM();
    return; // Não transmite para a rede
  }

  // CENÁRIO B: TEMPESTADE (Atenuação severa de sinal com drop de pacotes ~35%)
  if (state.tempestadeActive && Math.random() < 0.35) {
    state.metrics.dev1Failures++;
    state.metrics.dev2Failures++;
    state.metrics.deliveryRate = Math.max(55.0, state.metrics.deliveryRate - 1.5);
    logEvent('CHAOS', '⛈️ [TEMPESTADE] Pacote descartado por atenuação de sinal RF (Timeout de ACK).');
    atualizarMétricasDOM();
    if (state.modalOpen) atualizarModalDOM();
    return;
  }

  // Recuperação gradual da taxa de entrega se as rotas estiverem operacionais
  if (!state.tempestadeActive && state.metrics.deliveryRate < 100.0) {
    state.metrics.deliveryRate = Math.min(100.0, state.metrics.deliveryRate + 2.5);
  }

  // Incrementa contadores nominais de transmissão
  state.metrics.totalPackets += 2;
  state.metrics.dev1Sent++;
  state.metrics.dev2Sent++;
  state.metrics.packetSeq++;

  if (state.servers && state.servers['SRV-01']) {
    state.servers['SRV-01'].received += 2;
    state.servers['SRV-01'].approved += 2;
    const srv = state.servers['SRV-01'];
    srv.rate = srv.received > 0 ? (srv.approved / srv.received) * 100 : 0;
  }

  if (state.clients) {
    Object.values(state.clients).forEach(c => {
      c.packets += 2;
    });
  }

  const hexId = 'd5ae' + (4000 + state.metrics.packetSeq).toString(16);
  const pktNum = String(state.metrics.packetSeq).padStart(6, '0');
  const pathName = state.activeRoute === 'MQTT' ? 'PATH_A (MQTT/Wi-Fi)' : 'PATH_B (LoRaWAN)';

  // 2. Partículas do Dispositivo de Borda para a Infraestrutura de Transporte
  setTimeout(() => {
    if (state.activeRoute === 'MQTT' && !state.mqttFailed) {
      // Caminho A: Mosquitto Broker (Verde)
      dispararParticula('node-dev-01', 'node-mosquitto', '#10B981');
      dispararParticula('node-dev-02', 'node-mosquitto', '#10B981');
    } else if (!state.loraFailed) {
      // Caminho B: LoRa Gateway (Âmbar)
      dispararParticula('node-dev-01', 'node-gateway', '#F59E0B');
      dispararParticula('node-dev-02', 'node-gateway', '#F59E0B');
    }
  }, 250 / state.speed);

  // 3. Processamento -> Servidor Central SRV-01
  setTimeout(() => {
    if (state.activeRoute === 'MQTT' && !state.mqttFailed) {
      dispararParticula('node-mosquitto', 'node-srv-01', '#10B981');
    } else if (!state.loraFailed) {
      dispararParticula('node-gateway', 'node-bridge', '#F59E0B');
      dispararParticula('node-bridge', 'node-srv-01', '#10B981');
    }
  }, 550 / state.speed);

  // 4. Servidor Central -> Clientes Finais de Aplicação
  setTimeout(() => {
    dispararParticula('node-srv-01', 'node-client-gerencia', '#A855F7');
    dispararParticula('node-srv-01', 'node-client-analista', '#A855F7');
    dispararParticula('node-srv-01', 'node-client-tecnico', '#A855F7');
    dispararParticula('node-srv-01', 'node-client-estranho', '#6B7280');
  }, 900 / state.speed);

  // GERAÇÃO DE LOGS DE AUDITORIA (Fiel à imagem de referência da SNCT)
  logEvent('PACKET', `DEV-01:${hexId}:${pktNum} → IN_TRANSIT (${pathName})`);
  logEvent('PACKET', `CLI PC-ANA-01 (ANALISTA): DEV-01:${hexId}:${pktNum}`);
  logEvent('PACKET', `CLI PC-TEC-01 (TECNICO): DEV-01:${hexId}:${pktNum}`);
  if (Math.random() > 0.4) {
    logEvent('PACKET', `CLI PC-EST-01 (ESTRANHO): DEV-01:${hexId}:${pktNum}`);
  }

  // Alerta térmico caso ultrapasse o limite estipulado no sketch DHT22.ino (30.0 °C)
  if (state.sensors.temp > 30.0) {
    logEvent('ALERT', `⚠️ ALERTA TÉRMICO DHT22: Temperatura atingiu ${state.sensors.temp.toFixed(1)} °C (> 30.0 °C)`);
  }

  // Atualização dos componentes da UI
  atualizarMétricasDOM();
  if (state.modalOpen) {
    atualizarModalDOM();
  }
}

// Inicia loop de transmissão com taxa adaptável à velocidade
let cicloIntervalo = setInterval(simularCicloDeTransmissao, 2000 / state.speed);

function resetarIntervaloCiclo() {
  clearInterval(cicloIntervalo);
  cicloIntervalo = setInterval(simularCicloDeTransmissao, 2000 / state.speed);
}
btnSpeed.addEventListener('click', resetarIntervaloCiclo);

// ==========================================================================
// 5. ATUALIZAÇÃO DO DOM (CARDS E PAINÉIS REATIVOS)
// ==========================================================================
function atualizarMétricasDOM() {
  // 1. Dashboard Principal
  const elValTemp = document.getElementById('val-temp');
  if (elValTemp) elValTemp.innerHTML = `${state.sensors.temp.toFixed(1)}<span class="unit">°C</span>`;
  const elValUmid = document.getElementById('val-umid');
  if (elValUmid) elValUmid.innerHTML = `${state.sensors.umid.toFixed(1)}<span class="unit">%</span>`;
  const elValLux = document.getElementById('val-lux');
  if (elValLux) elValLux.innerHTML = `${Math.round(state.sensors.lux)}<span class="unit">Lux</span>`;
  const elValPackets = document.getElementById('val-packets');
  if (elValPackets) elValPackets.textContent = state.metrics.totalPackets;
  const elValDelivery = document.getElementById('val-delivery');
  if (elValDelivery) elValDelivery.innerHTML = `${state.metrics.deliveryRate.toFixed(1)}<span class="unit">%</span>`;

  const elDev1Sent = document.getElementById('dev1-sent');
  if (elDev1Sent) elDev1Sent.textContent = state.metrics.dev1Sent;
  const elDev1Buffer = document.getElementById('dev1-buffer');
  if (elDev1Buffer) elDev1Buffer.textContent = state.metrics.dev1Buffer;
  const elDev2Sent = document.getElementById('dev2-sent');
  if (elDev2Sent) elDev2Sent.textContent = state.metrics.dev2Sent;
  const elDev2Buffer = document.getElementById('dev2-buffer');
  if (elDev2Buffer) elDev2Buffer.textContent = state.metrics.dev2Buffer;

  // Atualiza card de saúde
  const healthCard = document.getElementById('metric-health');
  const healthTitle = document.getElementById('health-title');
  if (healthCard && healthTitle) {
    if (state.chaosActive) {
      healthCard.style.background = 'rgba(239, 68, 68, 0.12)';
      healthCard.style.borderColor = 'rgba(239, 68, 68, 0.4)';
      healthTitle.textContent = 'DEGRADADO';
      healthTitle.style.color = '#EF4444';
    } else {
      healthCard.style.background = 'rgba(16, 185, 129, 0.1)';
      healthCard.style.borderColor = 'rgba(16, 185, 129, 0.3)';
      healthTitle.textContent = 'SAUDÁVEL';
      healthTitle.style.color = '#10B981';
    }
  }

  // 2. Tela de Catálogo de Dispositivos (#/devices)
  atualizarTelaCatalogoDispositivos();

  // 3. Tela de Detalhes do Dispositivo (#/device/:id)
  atualizarTelaDetalheDispositivo();

  // 4. Tela de Catálogo de Servidores (#/servers)
  atualizarTelaCatalogoServidores();

  // 5. Tela de Detalhes do Servidor (#/device/SRV-01 ou #/server/:id)
  atualizarTelaDetalheServidor();

  // 6. Tela de Catálogo de Clientes (#/clients)
  atualizarTelaCatalogoClientes();

  // 7. Tela de Detalhes do Cliente (#/device/PC-...)
  atualizarTelaDetalheCliente();
}

function atualizarTelaCatalogoDispositivos() {
  const catDev1Sent = document.getElementById('cat-dev1-sent');
  if (!catDev1Sent) return;

  catDev1Sent.textContent = state.metrics.dev1Sent;
  const catDev1Fail = document.getElementById('cat-dev1-failures');
  if (catDev1Fail) catDev1Fail.textContent = state.metrics.dev1Failures;

  const pct1 = Math.min(100, Math.round((state.metrics.dev1Buffer / 1000) * 100));
  const catDev1Buf = document.getElementById('cat-dev1-buffer');
  if (catDev1Buf) catDev1Buf.textContent = `${pct1}%`;

  const catDev1Path = document.getElementById('cat-dev1-path');
  if (catDev1Path) catDev1Path.textContent = state.activeRoute;

  const status1 = document.getElementById('cat-dev1-status');
  if (status1) {
    if (state.chaosActive) {
      status1.textContent = 'FAILOVER';
      status1.className = 'catalog-status-badge failover';
    } else {
      status1.textContent = 'NORMAL';
      status1.className = 'catalog-status-badge normal';
    }
  }

  // DEV-02
  const catDev2Sent = document.getElementById('cat-dev2-sent');
  if (catDev2Sent) catDev2Sent.textContent = state.metrics.dev2Sent;
  const catDev2Fail = document.getElementById('cat-dev2-failures');
  if (catDev2Fail) catDev2Fail.textContent = state.metrics.dev2Failures;

  const pct2 = Math.min(100, Math.round((state.metrics.dev2Buffer / 1000) * 100));
  const catDev2Buf = document.getElementById('cat-dev2-buffer');
  if (catDev2Buf) catDev2Buf.textContent = `${pct2}%`;

  const catDev2Path = document.getElementById('cat-dev2-path');
  if (catDev2Path) catDev2Path.textContent = 'MQTT';
}

function atualizarTelaDetalheDispositivo() {
  const devTitle = document.getElementById('detail-device-title');
  if (!devTitle) return;

  const isDev1 = state.selectedDeviceId === 'DEV-01';
  const devData = isDev1 ? state.devices['DEV-01'] : state.devices['DEV-02'];
  const sensorData = isDev1 ? state.sensors : state.sensorsDev2;
  const sent = isDev1 ? state.metrics.dev1Sent : state.metrics.dev2Sent;
  const failures = isDev1 ? state.metrics.dev1Failures : state.metrics.dev2Failures;
  const bufferVal = isDev1 ? state.metrics.dev1Buffer : state.metrics.dev2Buffer;
  const failA = isDev1 ? state.metrics.dev1FailuresA : state.metrics.dev2FailuresA;
  const failback = isDev1 ? state.metrics.dev1Failback : state.metrics.dev2Failback;
  const currentPath = isDev1 ? state.activeRoute : 'MQTT';
  const isFailover = isDev1 && state.chaosActive;

  // Header do dispositivo
  devTitle.textContent = devData.id;
  const statusPill = document.getElementById('detail-status-pill');
  if (statusPill) {
    if (isFailover) {
      statusPill.textContent = 'FAILOVER';
      statusPill.className = 'detail-status-pill failover';
    } else {
      statusPill.textContent = 'NORMAL';
      statusPill.className = 'detail-status-pill normal';
    }
  }

  const metaEl = document.getElementById('detail-device-meta');
  if (metaEl) {
    metaEl.textContent = `${devData.name} · Boot: ${devData.boot} · Caminho: ${currentPath}`;
  }

  const avatarBox = document.getElementById('detail-device-avatar');
  if (avatarBox) {
    avatarBox.className = `detail-avatar-box ${devData.type}`;
    if (devData.type === 'arduino') {
      avatarBox.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="8" y1="12" x2="16" y2="12"/>
          <line x1="12" y1="8" x2="12" y2="16"/>
        </svg>
      `;
    } else {
      avatarBox.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="4" y="4" width="16" height="16" rx="2"/>
          <rect x="9" y="9" width="6" height="6"/>
          <path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3"/>
        </svg>
      `;
    }
  }

  // Quadrante 1: Leituras dos Sensores
  const tempEl = document.getElementById('detail-sensor-temp');
  if (tempEl) tempEl.textContent = sensorData.temp.toFixed(1);
  const umidEl = document.getElementById('detail-sensor-umid');
  if (umidEl) umidEl.textContent = sensorData.umid.toFixed(1);
  const luxEl = document.getElementById('detail-sensor-lux');
  if (luxEl) luxEl.textContent = sensorData.lux.toFixed(1);

  // Quadrante 2: Estatísticas de Envio
  const statSent = document.getElementById('detail-stat-sent');
  if (statSent) statSent.textContent = sent;
  const statFailures = document.getElementById('detail-stat-failures');
  if (statFailures) statFailures.textContent = failures;
  const statSeq = document.getElementById('detail-stat-seq');
  if (statSeq) statSeq.textContent = sent;
  const statFailA = document.getElementById('detail-stat-fail-a');
  if (statFailA) statFailA.textContent = failA;
  const statFailback = document.getElementById('detail-stat-failback');
  if (statFailback) statFailback.textContent = failback;

  // Quadrante 3: Buffer Store-and-Forward
  const bufCur = document.getElementById('detail-buffer-cur');
  if (bufCur) bufCur.textContent = bufferVal;
  const bufMax = document.getElementById('detail-buffer-max');
  if (bufMax) bufMax.textContent = '1000';
  const pct = Math.min(100, (bufferVal / 1000) * 100).toFixed(1);
  const bufPct = document.getElementById('detail-buffer-pct');
  if (bufPct) bufPct.textContent = `(${pct}%)`;
  const bufFill = document.getElementById('detail-buffer-fill');
  if (bufFill) {
    bufFill.style.width = `${pct}%`;
    if (pct >= 80) {
      bufFill.style.background = 'var(--color-alert)';
      bufFill.style.boxShadow = '0 0 10px var(--color-alert-glow)';
    } else if (pct >= 40) {
      bufFill.style.background = 'var(--color-lora)';
      bufFill.style.boxShadow = '0 0 10px var(--color-lora-glow)';
    } else {
      bufFill.style.background = 'var(--color-mqtt)';
      bufFill.style.boxShadow = '0 0 10px var(--color-mqtt-glow)';
    }
  }

  // Quadrante 4: Máquina de Estados
  const stateNormal = document.getElementById('fsm-state-normal');
  const stateFailover = document.getElementById('fsm-state-failover');
  const stateBlackout = document.getElementById('fsm-state-blackout');
  const stateRecovering = document.getElementById('fsm-state-recovering');

  if (stateNormal && stateFailover) {
    stateNormal.classList.remove('active');
    stateFailover.classList.remove('active');
    if (stateBlackout) stateBlackout.classList.remove('active');
    if (stateRecovering) stateRecovering.classList.remove('active');

    if (isFailover) {
      stateFailover.classList.add('active');
    } else {
      stateNormal.classList.add('active');
    }
  }
}

function atualizarTelaCatalogoServidores() {
  const srv = state.servers && state.servers['SRV-01'];
  if (!srv) return;

  const countPill = document.getElementById('registered-servers-count');
  if (countPill) countPill.textContent = `${Object.keys(state.servers).length} REGISTRADOS`;

  const srvStatus = document.getElementById('cat-srv1-status');
  if (srvStatus) {
    srvStatus.textContent = srv.status;
    srvStatus.className = `catalog-status-badge ${srv.status.toLowerCase() === 'online' ? 'normal' : 'failover'}`;
  }

  const srvReceived = document.getElementById('cat-srv1-received');
  if (srvReceived) srvReceived.textContent = srv.received;

  const srvApproved = document.getElementById('cat-srv1-approved');
  if (srvApproved) srvApproved.textContent = srv.approved;

  const srvRejected = document.getElementById('cat-srv1-rejected');
  if (srvRejected) srvRejected.textContent = srv.rejected;

  const srvRate = document.getElementById('cat-srv1-rate');
  if (srvRate) srvRate.textContent = `${srv.rate.toFixed(1)}%`;
}

function atualizarTelaDetalheServidor() {
  const srvId = state.selectedServerId || 'SRV-01';
  const srv = (state.servers && state.servers[srvId]) || {
    id: srvId,
    pipeline: 'Pipeline de 5 etapas',
    status: 'ONLINE',
    received: 986,
    approved: 0,
    rejected: 986,
    deduplicated: 0,
    rate: 0.0
  };

  const titleEl = document.getElementById('detail-server-title');
  if (titleEl) titleEl.textContent = srv.id;

  const statusEl = document.getElementById('detail-server-status');
  if (statusEl) {
    statusEl.textContent = srv.status;
    statusEl.className = `detail-status-pill ${srv.status.toLowerCase() === 'online' ? 'normal' : 'failover'}`;
  }

  const metaEl = document.getElementById('detail-server-meta');
  if (metaEl) metaEl.textContent = srv.pipeline;

  // Estatísticas
  const statRec = document.getElementById('server-stat-received');
  if (statRec) statRec.textContent = srv.received;

  const statApp = document.getElementById('server-stat-approved');
  if (statApp) {
    const appPct = srv.received > 0 ? ((srv.approved / srv.received) * 100).toFixed(1) : '0.0';
    statApp.textContent = `${srv.approved} (${appPct}%)`;
  }

  const statRej = document.getElementById('server-stat-rejected');
  if (statRej) {
    const rejPct = srv.received > 0 ? ((srv.rejected / srv.received) * 100).toFixed(1) : '100.0';
    statRej.textContent = `${srv.rejected} (${rejPct}%)`;
  }

  const statDedup = document.getElementById('server-stat-dedup');
  if (statDedup) statDedup.textContent = srv.deduplicated;

  // Taxa de aprovação e anel circular SVG
  const ratePct = srv.rate || 0;
  const rateText = document.getElementById('server-rate-percent');
  if (rateText) rateText.textContent = `${Math.round(ratePct)}%`;

  const ringCircle = document.getElementById('server-ring-circle');
  if (ringCircle) {
    const circumference = 289;
    const offset = circumference - (ratePct / 100) * circumference;
    ringCircle.style.strokeDashoffset = offset;
  }
}

function atualizarTelaCatalogoClientes() {
  if (!state.clients) return;

  const countPill = document.getElementById('registered-clients-count');
  if (countPill) countPill.textContent = `${Object.keys(state.clients).length} CONECTADOS`;

  const ger = state.clients['PC-GER-01'];
  if (ger) {
    const elPkt = document.getElementById('cat-pcger-packets');
    if (elPkt) elPkt.textContent = ger.packets;
  }

  const ana = state.clients['PC-ANA-01'];
  if (ana) {
    const elPkt = document.getElementById('cat-pcana-packets');
    if (elPkt) elPkt.textContent = ana.packets;
  }

  const tec = state.clients['PC-TEC-01'];
  if (tec) {
    const elPkt = document.getElementById('cat-pctec-packets');
    if (elPkt) elPkt.textContent = tec.packets;
  }

  const est = state.clients['PC-EST-01'];
  if (est) {
    const elPkt = document.getElementById('cat-pcest-packets');
    if (elPkt) elPkt.textContent = est.packets;
  }
}

function atualizarTelaDetalheCliente() {
  const cliId = state.selectedClientId || 'PC-GER-01';
  const cli = (state.clients && state.clients[cliId]) || {
    id: cliId,
    name: 'Cliente',
    role: 'CLIENTE',
    server: 'SRV-01',
    status: 'CONECTADO',
    packets: 986,
    avatarClass: 'client-avatar-ger',
    badgeClass: 'normal',
    type: 'gerencia'
  };

  // 1. Cabeçalho do Cliente
  const titleEl = document.getElementById('detail-client-title');
  if (titleEl) titleEl.textContent = cli.id;

  const roleBadge = document.getElementById('detail-client-role-badge');
  if (roleBadge) {
    roleBadge.textContent = cli.role;
    roleBadge.className = `detail-status-pill ${cli.badgeClass || 'normal'}`;
  }

  const metaEl = document.getElementById('detail-client-meta');
  if (metaEl) {
    metaEl.textContent = `Servidor: ${cli.server || 'SRV-01'} · Pacotes: ${cli.packets}`;
  }

  const avatarBox = document.getElementById('detail-client-avatar');
  const avatarSvg = document.getElementById('detail-client-avatar-svg');
  if (avatarBox) {
    avatarBox.className = `detail-avatar-box ${cli.avatarClass || 'client-avatar-ger'}`;
    if (avatarSvg) {
      if (cli.id === 'PC-GER-01') {
        avatarSvg.innerHTML = `
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        `;
      } else if (cli.id === 'PC-ANA-01') {
        avatarSvg.innerHTML = `
          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
          <polyline points="17 6 23 6 23 12" />
        `;
      } else if (cli.id === 'PC-TEC-01') {
        avatarSvg.innerHTML = `
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
        `;
      } else {
        avatarSvg.innerHTML = `
          <circle cx="12" cy="12" r="10" />
          <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
        `;
      }
    }
  }

  // 2. Alternância de Painel de Conteúdo Específico
  const panelGer = document.getElementById('client-panel-gerencia');
  const panelAna = document.getElementById('client-panel-analista');
  const panelTec = document.getElementById('client-panel-tecnico');
  const panelEst = document.getElementById('client-panel-estranho');

  if (panelGer) panelGer.style.display = 'none';
  if (panelAna) panelAna.style.display = 'none';
  if (panelTec) panelTec.style.display = 'none';
  if (panelEst) panelEst.style.display = 'none';

  if (cli.id === 'PC-GER-01') {
    if (panelGer) panelGer.style.display = 'block';
    const totalSent = document.getElementById('exec-total-sent');
    if (totalSent) totalSent.textContent = cli.packets;
    const rateEl = document.getElementById('exec-delivery-rate');
    if (rateEl) rateEl.textContent = `${state.metrics.deliveryRate.toFixed(1)}%`;
    const devEl = document.getElementById('exec-devices-count');
    if (devEl) devEl.textContent = '2';
    const failEl = document.getElementById('exec-failures-count');
    if (failEl) failEl.textContent = state.metrics.dev1Failures + state.metrics.dev2Failures;
  } else if (cli.id === 'PC-ANA-01') {
    if (panelAna) panelAna.style.display = 'block';
    // DEV-01 Sensores
    const t1 = document.getElementById('ana-dev1-temp');
    if (t1) t1.textContent = state.sensors.temp.toFixed(1);
    const u1 = document.getElementById('ana-dev1-umid');
    if (u1) u1.textContent = state.sensors.umid.toFixed(1);
    const l1 = document.getElementById('ana-dev1-lux');
    if (l1) l1.textContent = state.sensors.lux.toFixed(1);

    // DEV-02 Sensores
    const t2 = document.getElementById('ana-dev2-temp');
    if (t2) t2.textContent = state.sensorsDev2.temp.toFixed(1);
    const u2 = document.getElementById('ana-dev2-umid');
    if (u2) u2.textContent = state.sensorsDev2.umid.toFixed(1);
    const l2 = document.getElementById('ana-dev2-lux');
    if (l2) l2.textContent = state.sensorsDev2.lux.toFixed(1);
  } else if (cli.id === 'PC-TEC-01') {
    if (panelTec) panelTec.style.display = 'block';
    const info1 = document.getElementById('tec-dev1-info');
    if (info1) {
      info1.textContent = `${state.chaosActive ? 'FAILOVER' : 'NORMAL'} · Buffer: ${state.metrics.dev1Buffer}/1000 · Fails: ${state.metrics.dev1Failures}`;
    }
    const badge1 = document.getElementById('tec-dev1-badge');
    if (badge1) {
      if (state.chaosActive) {
        badge1.textContent = 'FAILOVER';
        badge1.className = 'diagnostic-badge failover';
      } else {
        badge1.textContent = 'NORMAL';
        badge1.className = 'diagnostic-badge normal';
      }
    }
    const info2 = document.getElementById('tec-dev2-info');
    if (info2) {
      info2.textContent = `NORMAL · Buffer: ${state.metrics.dev2Buffer}/1000 · Fails: ${state.metrics.dev2Failures}`;
    }
  } else if (cli.id === 'PC-EST-01') {
    if (panelEst) panelEst.style.display = 'block';
  }
}

// ==========================================================================
// 6. MOTOR DE LOGS EM TEMPO REAL COM FILTRO
// ==========================================================================
const logsContainer = document.getElementById('logs-container');
const filterChips = document.querySelectorAll('.filter-chip');
const MAX_LOGS = 120;

function logEvent(tipo, mensagem) {
  const agora = new Date();
  const timestamp = agora.toISOString().replace('Z', '-03:00');

  const entry = document.createElement('div');
  entry.className = `log-entry ${tipo}`;
  entry.dataset.type = tipo;

  entry.innerHTML = `
    <span class="log-timestamp">${timestamp}</span>
    <span class="log-tag ${tipo}">${tipo}</span>
    <span class="log-message">${mensagem}</span>
  `;

  // Aplica filtro visual
  if (state.activeLogFilter !== 'all' && state.activeLogFilter !== tipo) {
    entry.style.display = 'none';
  }

  logsContainer.appendChild(entry);

  // Mantém limite de logs na memória
  if (logsContainer.children.length > MAX_LOGS) {
    logsContainer.removeChild(logsContainer.firstChild);
  }

  // Auto-scroll para a linha mais recente
  logsContainer.scrollTop = logsContainer.scrollHeight;
}

filterChips.forEach(chip => {
  chip.addEventListener('click', () => {
    filterChips.forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    state.activeLogFilter = chip.dataset.filter;

    Array.from(logsContainer.children).forEach(entry => {
      if (state.activeLogFilter === 'all' || entry.dataset.type === state.activeLogFilter) {
        entry.style.display = 'flex';
      } else {
        entry.style.display = 'none';
      }
    });
  });
});

document.getElementById('btn-clear-logs').addEventListener('click', () => {
  logsContainer.innerHTML = '';
  logEvent('STATE', 'Console de logs limpo pelo operador.');
});

// ==========================================================================
// 7. MOTOR DE CHAOS ENGINEERING & GESTÃO DO DRAWER LATERAL
// ==========================================================================

// Abrir e fechar o Drawer Lateral de Caos
function abrirChaosDrawer() {
  state.chaosDrawerOpen = true;
  const drawer = document.getElementById('chaos-drawer');
  if (drawer) drawer.classList.add('open');
  const btnNavChaos = document.getElementById('btn-nav-chaos');
  if (btnNavChaos) btnNavChaos.classList.add('active');
}
window.abrirChaosDrawer = abrirChaosDrawer;

function fecharChaosDrawer() {
  state.chaosDrawerOpen = false;
  const drawer = document.getElementById('chaos-drawer');
  if (drawer) drawer.classList.remove('open');
  const btnNavChaos = document.getElementById('btn-nav-chaos');
  if (btnNavChaos) btnNavChaos.classList.remove('active');
  if (window.location.hash === '#/chaos' || window.location.hash === '#chaos') {
    window.location.hash = '#/dashboard';
  }
}
window.fecharChaosDrawer = fecharChaosDrawer;

// Histórico de injeções de caos no drawer
function adicionarHistoricoChaos(acao, status = 'OK', tipo = 'danger') {
  const list = document.getElementById('chaos-history-list');
  if (!list) return;

  const agora = new Date();
  const hora = String(agora.getHours()).padStart(2, '0');
  const min = String(agora.getMinutes()).padStart(2, '0');

  const item = document.createElement('div');
  item.className = `chaos-history-item ${tipo}`;
  item.innerHTML = `
    <span class="chaos-dot"></span>
    <span class="chaos-time">${hora}:${min}</span>
    <span class="chaos-action">${acao} → ${status}</span>
  `;

  list.insertBefore(item, list.firstChild);
  while (list.children.length > 20) {
    list.removeChild(list.lastChild);
  }
}
window.adicionarHistoricoChaos = adicionarHistoricoChaos;

// Atualização centralizada dos estados visuais da rede e nós
function atualizarEstadoRedeUI() {
  const routeA = document.getElementById('route-a');
  const routeB = document.getElementById('route-b');
  const mqttBadge = document.querySelector('.protocol-badge.mqtt');
  const loraBadge = document.querySelector('.protocol-badge.lora');
  const nodeMosquitto = document.getElementById('node-mosquitto');
  const nodeGateway = document.getElementById('node-gateway');
  const nodeNetserver = document.getElementById('node-netserver');
  const nodeBridge = document.getElementById('node-bridge');

  // 1. Nós da Topologia (Classes offline com pulso vermelho)
  if (nodeMosquitto) {
    if (state.mqttFailed) nodeMosquitto.classList.add('offline');
    else nodeMosquitto.classList.remove('offline');
  }

  [nodeGateway, nodeNetserver, nodeBridge].forEach(node => {
    if (node) {
      if (state.loraFailed) node.classList.add('offline');
      else node.classList.remove('offline');
    }
  });

  // 2. Badges de Rota do Painel Central
  if (routeA) {
    const badgeA = routeA.querySelector('.badge-active');
    if (badgeA) {
      if (state.mqttFailed) {
        routeA.classList.remove('active');
        routeA.classList.add('standby');
        badgeA.textContent = 'FALHA';
        badgeA.style.background = 'rgba(239, 68, 68, 0.2)';
        badgeA.style.color = '#EF4444';
      } else {
        routeA.classList.remove('standby');
        routeA.classList.add('active');
        badgeA.textContent = 'ATIVO';
        badgeA.style.background = '';
        badgeA.style.color = '';
      }
    }
  }

  if (routeB) {
    const badgeB = routeB.querySelector('.badge-standby');
    if (badgeB) {
      if (state.loraFailed) {
        routeB.classList.remove('active');
        routeB.classList.add('standby');
        badgeB.textContent = 'FALHA';
        badgeB.style.background = 'rgba(239, 68, 68, 0.2)';
        badgeB.style.color = '#EF4444';
      } else if (state.mqttFailed) {
        routeB.classList.remove('standby');
        routeB.classList.add('active');
        badgeB.textContent = 'FAILOVER ATIVO';
        badgeB.style.background = '';
        badgeB.style.color = '#F59E0B';
      } else {
        routeB.classList.remove('active');
        routeB.classList.add('standby');
        badgeB.textContent = 'STANDBY';
        badgeB.style.background = '';
        badgeB.style.color = '';
      }
    }
  }

  // 3. Badges de Protocolo
  if (mqttBadge && loraBadge) {
    if (state.activeRoute === 'MQTT') {
      mqttBadge.classList.add('active');
      loraBadge.classList.remove('active');
    } else if (state.activeRoute === 'LORA') {
      mqttBadge.classList.remove('active');
      loraBadge.classList.add('active');
    } else {
      mqttBadge.classList.remove('active');
      loraBadge.classList.remove('active');
    }
  }

  // 4. Status Pill Superior (Topbar)
  if (statusPill && statusPillText) {
    if (state.mqttFailed && state.loraFailed) {
      statusPill.className = 'status-pill alert';
      statusPillText.textContent = 'Blackout Total (Store-and-Forward)';
    } else if (state.mqttFailed) {
      statusPill.className = 'status-pill chaos';
      statusPillText.textContent = 'Modo LoRaWAN Resiliente';
    } else if (state.loraFailed) {
      statusPill.className = 'status-pill chaos';
      statusPillText.textContent = 'Modo MQTT Resiliente (LoRa Offline)';
    } else if (state.tempestadeActive) {
      statusPill.className = 'status-pill chaos';
      statusPillText.textContent = 'Tempestade (Alta Perda/Latência)';
    } else {
      statusPill.className = 'status-pill online';
      statusPillText.textContent = 'Sistema Online';
    }
  }

  // 5. Botão de Controle Rápido de Falha Wi-Fi
  if (btnToggleChaos) {
    if (state.mqttFailed) {
      btnToggleChaos.classList.add('active');
      btnToggleChaos.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M5 12.55a11 11 0 0 1 14.08 0"/>
          <line x1="12" y1="20" x2="12.01" y2="20"/>
        </svg>
        <span>Restaurar Conexão Wi-Fi (MQTT)</span>
      `;
    } else {
      btnToggleChaos.classList.remove('active');
      btnToggleChaos.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18.36 6.64a9 9 0 1 1-12.73 0"/>
          <line x1="12" y1="2" x2="12" y2="12"/>
        </svg>
        <span>Simular Queda de Wi-Fi / Failover</span>
      `;
    }
  }

  // 6. Destaque Visual dos Cards no Drawer
  const cardStorm = document.getElementById('card-scenario-storm');
  if (cardStorm) {
    if (state.tempestadeActive) cardStorm.classList.add('active');
    else cardStorm.classList.remove('active');
  }

  const cardBlackout = document.getElementById('card-scenario-blackout');
  if (cardBlackout) {
    if (state.blackoutActive) cardBlackout.classList.add('active');
    else cardBlackout.classList.remove('active');
  }
}
window.atualizarEstadoRedeUI = atualizarEstadoRedeUI;

// Ações da Seção TRANSPORTE (MQTT / LoRa)
function executarAcaoTransporte(tipo) {
  if (tipo === 'fail_mqtt') {
    state.mqttFailed = true;
    if (!state.loraFailed) {
      state.activeRoute = 'LORA';
      state.chaosActive = true;
    } else {
      state.activeRoute = 'NONE';
    }

    state.metrics.dev1Failures++;
    state.metrics.dev2Failures++;
    state.metrics.dev1FailuresA++;
    state.metrics.dev2FailuresA++;

    logEvent('CHAOS', '🔥 FALHA INJETADA: Rota Wi-Fi / MQTT desabilitada. Nó Mosquitto isolado.');
    if (!state.loraFailed) {
      logEvent('CHAOS', '⚡ FAILOVER AUTOMÁTICO: Tráfego redirecionado exclusivamente via LoRaWAN (Caminho B).');
    } else {
      logEvent('ALERT', '🚨 BLACKOUT: Nenhuma interface de rede disponível. Store-and-forward acumulando em memória.');
    }

    adicionarHistoricoChaos('fail_mqtt', 'OK', 'danger');
  } else if (tipo === 'restore_mqtt') {
    state.mqttFailed = false;
    state.blackoutActive = false;

    if (!state.loraFailed) {
      state.activeRoute = 'MQTT';
      state.chaosActive = false;
    } else {
      state.activeRoute = 'MQTT';
      state.chaosActive = false;
    }

    state.metrics.dev1Failback++;
    state.metrics.dev2Failback++;

    logEvent('CHAOS', '✅ RESTAURAÇÃO: Rota Wi-Fi / MQTT restabelecida. Broker Mosquitto online na porta 1883.');
    logEvent('STATE', '🔄 FAILBACK CONCLUÍDO: Tráfego nominal restaurado no Caminho A.');
    adicionarHistoricoChaos('restore_mqtt', 'OK', 'ok');

    // Descarrega buffers caso houvesse dados represados
    if (state.metrics.dev1Buffer > 0 || state.metrics.dev2Buffer > 0) {
      executarFlushBuffer();
    }
  } else if (tipo === 'fail_lora') {
    state.loraFailed = true;
    if (state.mqttFailed) {
      state.activeRoute = 'NONE';
    }

    logEvent('CHAOS', '🔥 FALHA INJETADA: Transceptor LoRaWAN SX1276 desabilitado. Gateway e Bridge isolados.');
    adicionarHistoricoChaos('fail_lora', 'OK', 'danger');
  } else if (tipo === 'restore_lora') {
    state.loraFailed = false;
    state.blackoutActive = false;

    if (state.mqttFailed) {
      state.activeRoute = 'LORA';
      state.chaosActive = true;
      if (state.metrics.dev1Buffer > 0 || state.metrics.dev2Buffer > 0) {
        executarFlushBuffer();
      }
    }

    logEvent('CHAOS', '✅ RESTAURAÇÃO: Rádio LoRaWAN 915 MHz e Gateway operacionais.');
    adicionarHistoricoChaos('restore_lora', 'OK', 'ok');
  }

  atualizarEstadoRedeUI();
  atualizarMétricasDOM();
}
window.executarAcaoTransporte = executarAcaoTransporte;

// Ações da Seção CENÁRIOS (Tempestade / Blackout)
function acionarCenario(cenario) {
  if (cenario === 'tempestade') {
    state.tempestadeActive = !state.tempestadeActive;
    if (state.tempestadeActive) {
      logEvent('CHAOS', '⛈️ CENÁRIO TEMPESTADE ATIVADO: Injetando atenuação climática, alta latência (+750ms) e perda de pacotes (~35%).');
      adicionarHistoricoChaos('storm_active', 'OK', 'warn');
    } else {
      logEvent('CHAOS', '☀️ CENÁRIO TEMPESTADE DESATIVADO: Propagação RF e latência nominal restauradas.');
      adicionarHistoricoChaos('storm_cleared', 'OK', 'ok');
      state.metrics.deliveryRate = 100.0;
    }
  } else if (cenario === 'blackout') {
    state.blackoutActive = !state.blackoutActive;
    if (state.blackoutActive) {
      state.mqttFailed = true;
      state.loraFailed = true;
      state.activeRoute = 'NONE';
      state.chaosActive = true;

      logEvent('CHAOS', '⚡🚨 BLACKOUT TOTAL ACIONADO: Todas as interfaces de rede cortadas! Isolamento total de infraestrutura.');
      logEvent('STATE', '💾 STORE-AND-FORWARD ATIVADO: Microcontroladores retendo pacotes localmente na memória flash.');
      adicionarHistoricoChaos('blackout_total', 'ATIVO', 'danger');
    } else {
      state.mqttFailed = false;
      state.loraFailed = false;
      state.activeRoute = 'MQTT';
      state.chaosActive = false;

      logEvent('CHAOS', '✅ BLACKOUT ENCERRADO: Rede restabelecida. Descarregando buffer acumulado...');
      adicionarHistoricoChaos('blackout_end', 'OK', 'ok');
      executarFlushBuffer();
    }
  }

  atualizarEstadoRedeUI();
  atualizarMétricasDOM();
}
window.acionarCenario = acionarCenario;

// Ações da Seção DISPOSITIVOS (Failover / Overflow)
function executarAcaoDispositivo(acao) {
  if (acao === 'failover') {
    if (!state.chaosActive) {
      executarAcaoTransporte('fail_mqtt');
      logEvent('CHAOS', '🕹️ FSM DISPOSITIVO: Transição forçada de estado pelo operador → FAILOVER');
      adicionarHistoricoChaos('force_failover', 'OK', 'warn');
    } else {
      executarAcaoTransporte('restore_mqtt');
      logEvent('CHAOS', '🕹️ FSM DISPOSITIVO: Transição forçada de estado pelo operador → NORMAL');
      adicionarHistoricoChaos('force_failback', 'OK', 'ok');
    }
  } else if (acao === 'overflow') {
    state.metrics.dev1Buffer = 1000;
    state.metrics.dev2Buffer = 1000;
    logEvent('ALERT', '⚠️ CRÍTICO: BUFFER OVERFLOW FORÇADO! Memória de 1000/1000 pacotes esgotada no ESP32 e Arduino. Tail Drop ativado.');
    adicionarHistoricoChaos('buffer_overflow', 'OVERFLOW', 'danger');
    atualizarMétricasDOM();
  }
}
window.executarAcaoDispositivo = executarAcaoDispositivo;

// Flush do buffer Store-and-Forward (descarregamento acelerado de pacotes represados)
function executarFlushBuffer() {
  const buf1 = state.metrics.dev1Buffer;
  const buf2 = state.metrics.dev2Buffer;
  const total = buf1 + buf2;

  if (total <= 0) return;

  logEvent('STATE', `📦 INICIANDO FLUSH STORE-AND-FORWARD: Descarregando ${total} pacotes represados para o SRV-01...`);

  let burst = 0;
  const burstInterval = setInterval(() => {
    burst++;
    const rotaAlvo = state.mqttFailed ? 'node-gateway' : 'node-mosquitto';
    const cor = state.mqttFailed ? '#F59E0B' : '#10B981';

    dispararParticula('node-dev-01', rotaAlvo, cor);
    dispararParticula('node-dev-02', rotaAlvo, cor);

    setTimeout(() => {
      if (state.mqttFailed) {
        dispararParticula('node-gateway', 'node-bridge', '#F59E0B');
        dispararParticula('node-bridge', 'node-srv-01', '#10B981');
      } else {
        dispararParticula('node-mosquitto', 'node-srv-01', '#10B981');
      }
    }, 180);

    state.metrics.dev1Buffer = Math.max(0, Math.floor(state.metrics.dev1Buffer * 0.4));
    state.metrics.dev2Buffer = Math.max(0, Math.floor(state.metrics.dev2Buffer * 0.4));
    state.metrics.deliveryRate = Math.min(100.0, state.metrics.deliveryRate + 20.0);
    atualizarMétricasDOM();

    if (burst >= 5) {
      clearInterval(burstInterval);
      state.metrics.dev1Buffer = 0;
      state.metrics.dev2Buffer = 0;
      state.metrics.deliveryRate = 100.0;
      atualizarMétricasDOM();
      logEvent('STATE', `✅ FLUSH CONCLUÍDO: Todos os ${total} pacotes represados foram integrados com sucesso no pipeline do SRV-01.`);
      adicionarHistoricoChaos('flush_buffer', 'CONCLUÍDO', 'ok');
    }
  }, 160);
}
window.executarFlushBuffer = executarFlushBuffer;

// Sincroniza o botão antigo de alternar Wi-Fi
function alternarFalhaWiFi() {
  executarAcaoTransporte(state.mqttFailed ? 'restore_mqtt' : 'fail_mqtt');
}
window.alternarFalhaWiFi = alternarFalhaWiFi;

// ==========================================================================
// 8. MODAL DE INSPEÇÃO DETALHADA DO SENSOR (DHT22)
// ==========================================================================
const modalOverlay = document.getElementById('modal-sensor-overlay');

function abrirDetalheSensor(tipoSensor = 'temp') {
  state.modalOpen = true;
  modalOverlay.classList.add('open');
  atualizarModalDOM();
  logEvent('STATE', `Operador abriu inspeção de parâmetros do sensor: ${tipoSensor.toUpperCase()}`);
}
window.abrirDetalheSensor = abrirDetalheSensor;

function fecharModalSensor() {
  state.modalOpen = false;
  modalOverlay.classList.remove('open');
}
window.fecharModalSensor = fecharModalSensor;

modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) fecharModalSensor();
});

function trocarAbaModal(tabId) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

  const btn = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
  if (btn) btn.classList.add('active');
  const content = document.getElementById(tabId);
  if (content) content.classList.add('active');
}
window.trocarAbaModal = trocarAbaModal;

function atualizarModalDOM() {
  const t = state.sensors.temp;
  const u = state.sensors.umid;
  const s = state.sensors.heatIndex;

  document.getElementById('modal-temp-val').innerHTML = `${t.toFixed(1)} <span class="unit">°C</span>`;
  document.getElementById('modal-temp-bar').style.width = `${Math.min(Math.max((t / 50) * 100, 0), 100)}%`;

  document.getElementById('modal-umid-val').innerHTML = `${u.toFixed(1)} <span class="unit">%</span>`;
  document.getElementById('modal-umid-bar').style.width = `${Math.min(Math.max(u, 0), 100)}%`;

  document.getElementById('modal-sens-val').innerHTML = `${s.toFixed(1)} <span class="unit">°C</span>`;
  document.getElementById('modal-sens-bar').style.width = `${Math.min(Math.max((s / 50) * 100, 0), 100)}%`;

  document.getElementById('modal-umid-comfort').textContent = 
    u < 30 ? 'Ar Seco (Abaixo do Ideal)' : u <= 60 ? 'Umidade Confortável' : 'Ar Úmido';

  // Atualiza Payload JSON exibido
  const payloadExemplo = {
    device_id: "DEV-01",
    client_name: "ESP32_SNCT_UABJ",
    protocol: state.activeRoute,
    timestamp: new Date().toISOString(),
    sensors: {
      temperature: Number(t.toFixed(1)),
      humidity: Number(u.toFixed(1)),
      heat_index: Number(s.toFixed(1)),
      status: state.sensors.status,
      pin: 5
    },
    network: {
      ip: state.realEsp.connected ? state.realEsp.ip : "10.0.0.175",
      path: state.activeRoute === 'MQTT' ? "PATH_A_WIFI_MOSQUITTO" : "PATH_B_LORA_GATEWAY",
      packets_sent: state.metrics.dev1Sent,
      buffer_pending: state.metrics.dev1Buffer
    }
  };

  document.getElementById('modal-json-preview').textContent = JSON.stringify(payloadExemplo, null, 2);
}

// Helpers para abrir outros nós da topologia
window.abrirDetalheDev = (devId) => {
  navegarPara(`#/device/${devId}`);
};
window.abrirPaginaDetalheDev = (devId) => {
  navegarPara(`#/device/${devId}`);
};

window.abrirDetalheBroker = (broker) => {
  logEvent('STATE', `Broker ${broker} - Conexões ativas: 2 clientes de borda, 1 servidor central`);
  alert(`Broker MQTT ${broker}\nStatus: Operacional na porta 1883 / 8883 (TLS)\nTópico ativo: oficina/snct/dev01/telemetria`);
};

window.abrirDetalhePipeline = () => {
  navegarPara('#/device/SRV-01');
};

// ==========================================================================
// 9. CÁLCULO DA SENSAÇÃO TÉRMICA (HEAT INDEX - FÓRMULA NOAA)
// ==========================================================================
function calcularSensacaoTermica(temperatura, umidade) {
  // Conversão para Fahrenheit para aplicação da fórmula padrão
  const T = (temperatura * 9 / 5) + 32;
  const R = umidade;

  let hi = 0.5 * (T + 61.0 + ((T - 68.0) * 1.2) + (R * 0.094));

  if (hi > 79) {
    hi = -42.379 + 2.04901523 * T + 10.14333127 * R - 0.22475541 * T * R
         - 0.00683783 * T * T - 0.05481717 * R * R + 0.00122874 * T * T * R
         + 0.00085282 * T * R * R - 0.00000199 * T * T * R * R;

    if (R < 13 && T >= 80 && T <= 112) {
      hi -= ((13 - R) / 4) * Math.sqrt((17 - Math.abs(T - 95.0)) / 17);
    } else if (R > 85 && T >= 80 && T <= 87) {
      hi += ((R - 85) / 10) * ((87 - T) / 5);
    }
  }

  // Retorna em Celsius
  return (hi - 32) * 5 / 9;
}

// ==========================================================================
// 10. INTEGRAÇÃO REAL COM ESP32 (LEITURA DO SKETCH DHT22.ino)
// ==========================================================================
async function conectarEspReal() {
  const ipInput = document.getElementById('input-esp-ip').value.trim();
  const statusEl = document.getElementById('esp-connect-status');
  statusEl.textContent = `Tentando conectar a ${ipInput}/dados...`;
  statusEl.style.color = '#F59E0B';

  try {
    const url = ipInput.startsWith('http') ? `${ipInput}/dados` : `http://${ipInput}/dados`;
    const response = await fetch(url, { signal: AbortSignal.timeout(3000) });
    const data = await response.json();

    if (data.ok) {
      state.realEsp.connected = true;
      state.realEsp.ip = ipInput;
      state.sensors.temp = data.t;
      state.sensors.umid = data.u;
      state.sensors.heatIndex = data.s || calcularSensacaoTermica(data.t, data.u);
      statusEl.textContent = `✅ Conectado ao ESP32 real com sucesso! Sensor: ${data.sensor}`;
      statusEl.style.color = '#10B981';

      logEvent('STATE', `🔌 ESP32 REAL CONECTADO: IP ${ipInput} - DHT Leitura: ${data.t}°C / ${data.u}%`);

      // Inicia polling periódico real
      if (state.realEsp.timer) clearInterval(state.realEsp.timer);
      state.realEsp.timer = setInterval(async () => {
        try {
          const r = await fetch(url);
          const d = await r.json();
          if (d.ok) {
            state.sensors.temp = d.t;
            state.sensors.umid = d.u;
            state.sensors.heatIndex = d.s || calcularSensacaoTermica(d.t, d.u);
            state.sensors.status = 'OK';
          }
        } catch (err) {
          logEvent('ALERT', '⚠️ Falha temporária ao ler o ESP32 real na rede.');
        }
      }, 2500);
    }
  } catch (err) {
    state.realEsp.connected = false;
    statusEl.textContent = `⚠️ Não foi possível alcançar o ESP32 no endereço informado. Mantendo simulação IoT contínua.`;
    statusEl.style.color = '#EF4444';
    logEvent('ALERT', `Falha ao tentar conectar no IP ${ipInput}. Certifique-se de que o ESP32 está na mesma rede.`);
  }
}
window.conectarEspReal = conectarEspReal;

document.getElementById('btn-connect-esp').addEventListener('click', () => {
  abrirDetalheSensor('temp');
  trocarAbaModal('tab-config');
});

// Inicialização com primeiro conjunto de logs
logEvent('STATE', 'SISTEMA INICIALIZADO: Plataforma Resilient IoT (SNCT 2026).');
logEvent('STATE', 'Broker MQTT Mosquitto online na porta 1883.');
logEvent('PACKET', 'DEV-01 (ESP32) registrou tópicos de telemetria e controle.');
logEvent('PACKET', 'DEV-02 (Arduino UNO R4) conectado via gateway secundário.');

// ==========================================================================
// 11. ROTEADOR SPA VANILLA & GESTÃO DE TELAS
// ==========================================================================
function navegarPara(novaRota) {
  if (window.location.hash === novaRota) {
    gerenciarRota();
  } else {
    window.location.hash = novaRota;
  }
}
window.navegarPara = navegarPara;

function gerenciarRota() {
  const hash = window.location.hash || '#/dashboard';
  const viewDashboard = document.getElementById('view-dashboard');
  const viewDevices = document.getElementById('view-devices');
  const viewDeviceDetail = document.getElementById('view-device-detail');
  const viewServers = document.getElementById('view-servers');
  const viewServerDetail = document.getElementById('view-server-detail');
  const pageTitle = document.getElementById('page-title');
  const navItems = document.querySelectorAll('.nav-item');

  // Remove classe active de todos os botões da barra lateral
  navItems.forEach(item => item.classList.remove('active'));

  // Se navegar para uma rota diferente de chaos, fecha o drawer lateral
  if (hash !== '#/chaos' && hash !== '#chaos' && state.chaosDrawerOpen) {
    const drawer = document.getElementById('chaos-drawer');
    if (drawer) drawer.classList.remove('open');
    state.chaosDrawerOpen = false;
  }

  // Oculta todas as telas por padrão
  if (viewDashboard) viewDashboard.style.display = 'none';
  if (viewDevices) viewDevices.style.display = 'none';
  if (viewDeviceDetail) viewDeviceDetail.style.display = 'none';
  if (viewServers) viewServers.style.display = 'none';
  if (viewServerDetail) viewServerDetail.style.display = 'none';
  const viewClients = document.getElementById('view-clients');
  const viewClientDetail = document.getElementById('view-client-detail');
  if (viewClients) viewClients.style.display = 'none';
  if (viewClientDetail) viewClientDetail.style.display = 'none';

  // Identifica se a rota é um detalhe de servidor (ex.: #/device/SRV-01 ou #/server/SRV-01)
  const isServerDetail = hash.startsWith('#/server/') || hash.toUpperCase().startsWith('#/DEVICE/SRV');
  // Identifica se a rota é um detalhe de cliente (ex.: #/device/PC-GER-01 ou #/client/PC-...)
  const isClientDetail = hash.startsWith('#/client/') || hash.toUpperCase().startsWith('#/DEVICE/PC');

  if (isServerDetail) {
    const srvId = hash.startsWith('#/server/')
      ? hash.replace('#/server/', '').toUpperCase()
      : hash.replace('#/device/', '').toUpperCase();
    state.selectedServerId = srvId || 'SRV-01';
    state.currentRoute = 'server-detail';

    if (viewServerDetail) viewServerDetail.style.display = 'block';
    if (pageTitle) pageTitle.textContent = 'Detalhes';
    const btnNavServers = document.getElementById('btn-nav-servers');
    if (btnNavServers) btnNavServers.classList.add('active');

    atualizarTelaDetalheServidor();
    logEvent('STATE', `Painel de métricas do servidor carregado: ${state.selectedServerId}`);
  } else if (isClientDetail) {
    const cliId = hash.startsWith('#/client/')
      ? hash.replace('#/client/', '').toUpperCase()
      : hash.replace('#/device/', '').toUpperCase();
    state.selectedClientId = cliId || 'PC-GER-01';
    state.currentRoute = 'client-detail';

    if (viewClientDetail) viewClientDetail.style.display = 'block';
    if (pageTitle) pageTitle.textContent = 'Detalhes';
    const btnNavClients = document.getElementById('btn-nav-clients');
    if (btnNavClients) btnNavClients.classList.add('active');

    atualizarTelaDetalheCliente();
    logEvent('STATE', `Painel do cliente carregado: ${state.selectedClientId}`);
  } else if (hash.startsWith('#/device/')) {
    // Tela de detalhes de um dispositivo (ex.: #/device/DEV-01 ou #/device/DEV-02)
    const devId = hash.replace('#/device/', '').toUpperCase() || 'DEV-01';
    state.selectedDeviceId = devId;
    state.currentRoute = 'device-detail';

    if (viewDeviceDetail) viewDeviceDetail.style.display = 'block';
    if (pageTitle) pageTitle.textContent = 'Detalhes';
    const btnNavDevices = document.getElementById('btn-nav-devices');
    if (btnNavDevices) btnNavDevices.classList.add('active');

    atualizarTelaDetalheDispositivo();
    logEvent('STATE', `Painel de telemetria detalhada carregado para: ${devId}`);
  } else if (hash === '#/devices' || hash === '#dispositivos' || hash === '#devices') {
    // Tela de catálogo de dispositivos
    state.currentRoute = 'devices';
    if (viewDevices) viewDevices.style.display = 'block';
    if (pageTitle) pageTitle.textContent = 'Dispositivos';
    const btnNavDevices = document.getElementById('btn-nav-devices');
    if (btnNavDevices) btnNavDevices.classList.add('active');

    atualizarTelaCatalogoDispositivos();
    logEvent('STATE', 'Catálogo de nós de coleta aberto.');
  } else if (hash === '#/servers' || hash === '#servidores') {
    state.currentRoute = 'servers';
    if (viewServers) viewServers.style.display = 'block';
    if (pageTitle) pageTitle.textContent = 'Servidores';
    const btnNavServers = document.getElementById('btn-nav-servers');
    if (btnNavServers) btnNavServers.classList.add('active');

    atualizarTelaCatalogoServidores();
    logEvent('STATE', 'Catálogo de servidores e infraestrutura central aberto.');
  } else if (hash === '#/clients' || hash === '#clientes') {
    state.currentRoute = 'clients';
    if (viewClients) viewClients.style.display = 'block';
    if (pageTitle) pageTitle.textContent = 'Clientes';
    const btnNavClients = document.getElementById('btn-nav-clients');
    if (btnNavClients) btnNavClients.classList.add('active');

    atualizarTelaCatalogoClientes();
    logEvent('STATE', 'Catálogo de clientes de aplicação aberto.');
  } else if (hash === '#/chaos' || hash === '#chaos') {
    state.currentRoute = 'chaos';
    if (viewDashboard) viewDashboard.style.display = 'block';
    if (pageTitle) pageTitle.textContent = 'Chaos Engineering';
    const btnNavChaos = document.getElementById('btn-nav-chaos');
    if (btnNavChaos) btnNavChaos.classList.add('active');
    abrirChaosDrawer();
  } else if (hash === '#/logs' || hash === '#logs') {
    state.currentRoute = 'logs';
    fecharChaosDrawer();
    if (viewDashboard) viewDashboard.style.display = 'block';
    if (pageTitle) pageTitle.textContent = 'Auditoria & Logs';
    const btnNavLogs = document.getElementById('btn-nav-logs');
    if (btnNavLogs) btnNavLogs.classList.add('active');
  } else {
    // Default: Dashboard Principal
    state.currentRoute = 'dashboard';
    if (viewDashboard) viewDashboard.style.display = 'block';
    if (pageTitle) pageTitle.textContent = 'Dashboard';
    const btnNavDash = document.getElementById('btn-nav-dashboard');
    if (btnNavDash) btnNavDash.classList.add('active');
  }

  // Redimensiona o canvas da topologia caso a rota seja o Dashboard ou Chaos
  if (state.currentRoute === 'dashboard' || state.currentRoute === 'chaos') {
    setTimeout(() => {
      if (typeof redimensionarCanvas === 'function') {
        redimensionarCanvas();
      }
    }, 50);
  }

  atualizarEstadoRedeUI();
  atualizarMétricasDOM();
}

// Intercepta clique no botão do menu Chaos Engineering para garantir abertura do Drawer
const btnNavChaosElem = document.getElementById('btn-nav-chaos');
if (btnNavChaosElem) {
  btnNavChaosElem.addEventListener('click', (e) => {
    e.preventDefault();
    abrirChaosDrawer();
    if (window.location.hash !== '#/chaos') {
      window.location.hash = '#/chaos';
    }
  });
}

window.addEventListener('hashchange', gerenciarRota);
window.addEventListener('DOMContentLoaded', gerenciarRota);
// Executa imediatamente para sincronizar rota inicial
gerenciarRota();
