//***************************
//CONTROLA VÁRIOS LEDS PELO NAVEGADOR - PÁGINA DA 23ª SNCT
//***************************

#include <WiFi.h>

const char* SSID = "Mateus"; //Nome da rede WI-FI que deseja se conectar
const char* PASSWORD = "12345678"; //Senha da rede WI-FI que deseja se conectar

//Lista de LEDs: nome (vai na URL), pino, cor na página e estado
//Para colocar mais LEDs, é só acrescentar uma linha aqui!
struct Led {
  String nome;
  int pino;
  String cor;
  bool ligado;
};

Led leds[] = {
  {"vermelho", 5,  "#FF3B3B", false},  // D5
  {"amarelo",  25, "#FFC845", false},  // D25
  {"verde",    26, "#3DDC84", false},  // D26
  {"azul",     27, "#3D8BFF", false},  // D27
};
const int TOTAL_LEDS = sizeof(leds) / sizeof(leds[0]); //Conta quantos LEDs tem na lista

//Defino a porta do servidor Web
WiFiServer server(80);

//Página do site (com o símbolo da SNCT desenhado em SVG, não precisa de internet)
//Os cartões dos LEDs são montados pelo navegador a partir da lista que o ESP32 manda em /estado
const char PAGINA[] PROGMEM = R"rawliteral(
<!DOCTYPE html><html lang="pt-br"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>LEDs · 23ª SNCT</title>
<style>
:root{--fundo:#23266E;--fundo2:#2F3390;--card:rgba(255,255,255,.08);--branco:#FFFFFF;--rosa:#EC4B87;
--menta:#9FE2C5;--amarelo:#FFC845}
*{box-sizing:border-box;margin:0}
body{min-height:100vh;font-family:system-ui,"Segoe UI",Roboto,sans-serif;color:var(--branco);
background:radial-gradient(circle at 85% 10%,var(--fundo2),var(--fundo) 60%);
background-color:var(--fundo);display:flex;flex-direction:column;align-items:center;padding:20px 16px}
body:before{content:"";position:fixed;inset:0;pointer-events:none;
background-image:radial-gradient(rgba(255,255,255,.07) 1.5px,transparent 1.5px);background-size:22px 22px}
header{display:flex;align-items:center;gap:14px;width:100%;max-width:460px;position:relative}
header svg{width:96px;flex:none}
header h1{font-size:22px;line-height:1.15}
header p{font-size:13px;opacity:.75;margin-top:4px}
.painel{position:relative;width:100%;max-width:460px;margin-top:22px;padding:20px 16px 22px;border-radius:26px;
background:var(--card);border:1px solid rgba(255,255,255,.14);text-align:center}
.estrela{position:absolute;top:-18px;right:-10px;width:60px;transform:rotate(12deg)}
.resumo{font-size:15px;opacity:.8;margin-bottom:14px}
.resumo b{color:var(--amarelo)}
.grade{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:12px}
.led{border:0;border-radius:20px;padding:14px 8px 16px;cursor:pointer;color:var(--branco);
background:rgba(255,255,255,.07);border:2px solid transparent;transition:border-color .25s,background .25s}
.led.on{border-color:var(--c);background:rgba(255,255,255,.13)}
.led svg{width:64px;height:104px;display:block;margin:0 auto 8px;overflow:visible}
.cupula{fill:var(--c);filter:brightness(.35) saturate(.6);transition:filter .25s}
.halo{fill:var(--c);opacity:0;transition:opacity .25s}
.on .cupula{filter:none}
.on .halo{opacity:.28}
.on svg{filter:drop-shadow(0 0 14px var(--c))}
.nome{font-size:17px;font-weight:700;text-transform:capitalize}
.sit{font-size:12px;opacity:.65;margin-top:2px;letter-spacing:1px}
.on .sit{opacity:1;color:var(--c)}
.mini{width:52px;height:28px;border-radius:14px;margin:10px auto 0;position:relative;
background:rgba(255,255,255,.2);transition:background .25s}
.mini:after{content:"";position:absolute;top:4px;left:4px;width:20px;height:20px;border-radius:50%;
background:var(--branco);transition:left .25s}
.on .mini{background:var(--rosa)}
.on .mini:after{left:28px}
.botoes{display:flex;gap:12px;justify-content:center;margin-top:18px}
.botoes button{flex:1;padding:14px;border:0;border-radius:14px;font-size:16px;font-weight:700;cursor:pointer;color:var(--fundo)}
.todos-on{background:var(--menta)}
.todos-off{background:rgba(255,255,255,.85)}
.erro{color:var(--amarelo);font-size:14px;margin-top:12px;min-height:18px}
footer{margin-top:auto;padding-top:26px;font-size:12px;opacity:.6;text-align:center;position:relative}
</style></head><body>

<header>
  <svg viewBox="0 0 940 800" aria-label="23ª SNCT">
    <path d="M365 105L420 70L440 75L460 72L470 62L462 48L500 35L530 20L545 22L545 65L555 72L615 60L660 35L672 45L680 72
L695 92L780 130L850 155L880 165L905 180L910 220L870 260L845 300L835 330L830 400L815 430L795 450L745 452L715 475
L695 520L665 560L640 592L625 595L580 560L578 545L625 490L605 465L570 430L555 395L552 375L530 335L505 315L470 295
L450 262L440 245L385 272L370 268L335 232L322 215L330 195L358 175L367 165Z"
      fill="none" stroke="#9FE2C5" stroke-width="16" stroke-linejoin="round"/>
    <path d="M770 470 Q790 560 880 580 Q790 600 770 690 Q750 600 660 580 Q750 560 770 470Z" fill="#EC4B87"/>
    <g fill="#FFFFFF" font-family="Arial Black,Arial,sans-serif" font-weight="900">
      <text x="30" y="185" font-size="150">23ª</text>
      <text x="20" y="470" font-size="290">S</text>
      <text x="245" y="470" font-size="290">N</text>
      <text x="15" y="740" font-size="290">C</text>
      <text x="255" y="740" font-size="290">T</text>
    </g>
  </svg>
  <div>
    <h1>Oficina ESP32<br>+ MQTT</h1>
    <p>23ª Semana Nacional de Ciência e Tecnologia</p>
  </div>
</header>

<main class="painel">
  <svg class="estrela" viewBox="0 0 100 100"><path d="M50 0Q58 42 100 50Q58 58 50 100Q42 58 0 50Q42 42 50 0Z" fill="#EC4B87"/></svg>
  <div class="resumo" id="resumo">Carregando...</div>
  <div class="grade" id="grade"></div>
  <div class="botoes">
    <button class="todos-on" onclick="enviar('/todos/1')">Ligar todos</button>
    <button class="todos-off" onclick="enviar('/todos/0')">Desligar todos</button>
  </div>
  <div class="erro" id="erro"></div>
</main>

<footer>Engenharia da Computação · UFRPE/UABJ<br>Toque num LED para ligar ou desligar</footer>

<script>
const LED_SVG = `<svg viewBox="0 0 120 200">
  <circle class="halo" cx="60" cy="58" r="58"/>
  <path class="cupula" d="M28 118V54a32 32 0 0 1 64 0v64z"/>
  <rect class="cupula" x="22" y="114" width="76" height="12" rx="3"/>
  <path d="M40 104V58a20 20 0 0 1 12-18" stroke="#fff" stroke-width="6" stroke-linecap="round" fill="none" opacity=".45"/>
  <g stroke="#C9CDD4" stroke-width="6" stroke-linecap="round" fill="none"><path d="M48 126v70"/><path d="M72 126v40l8 10v14"/></g>
</svg>`;

function desenhar(lista) {
  const grade = document.getElementById('grade');
  if (grade.children.length !== lista.length) {          // cria os cartões só na primeira vez
    grade.innerHTML = '';
    lista.forEach(l => {
      const b = document.createElement('button');
      b.className = 'led';
      b.style.setProperty('--c', l.cor);
      b.innerHTML = LED_SVG + `<div class="nome">${l.nome}</div><div class="sit"></div><div class="mini"></div>`;
      b.onclick = () => enviar('/' + l.nome + '/' + (b.classList.contains('on') ? '0' : '1'));
      grade.appendChild(b);
    });
  }
  lista.forEach((l, i) => {
    const b = grade.children[i];
    b.classList.toggle('on', l.ligado);
    b.querySelector('.sit').textContent = l.ligado ? 'LIGADO' : 'desligado';
  });
  const acesos = lista.filter(l => l.ligado).length;
  document.getElementById('resumo').innerHTML = `<b>${acesos}</b> de ${lista.length} LEDs acesos`;
}

async function enviar(caminho) {
  try {
    const r = await fetch(caminho);
    desenhar(await r.json());
    document.getElementById('erro').textContent = '';
  } catch (e) {
    document.getElementById('erro').textContent = 'Sem resposta do ESP32. Tente de novo.';
  }
}
enviar('/estado');
</script>
</body></html>
)rawliteral";

//Configurações iniciais *******************
void setup() {
  //Todos os pinos dos LEDs como saída, começando desligados
  for (int i = 0; i < TOTAL_LEDS; i++) {
    pinMode(leds[i].pino, OUTPUT);
    digitalWrite(leds[i].pino, LOW);
  }
  //Especifico a comunicação com o monitor
  Serial.begin(9600);
  //Fica em loop até conectar
  WiFi.begin(SSID, PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
      delay(100);
      Serial.print(".");
  }
  //Mostro o IP obtido no monitor
  Serial.println("");
  Serial.print("IP obtido: http://");
  Serial.println(WiFi.localIP());

  //Inicia o servidor web
  server.begin();
}

//Liga ou desliga um LED e guarda o estado
void mudarLed(int i, bool ligar) {
  digitalWrite(leds[i].pino, ligar ? HIGH : LOW);
  leds[i].ligado = ligar;
  Serial.print(leds[i].nome);
  Serial.println(ligar ? " liga" : " desliga");
}

//Responde com a lista dos LEDs em JSON
//Ex.: [{"nome":"vermelho","cor":"#FF3B3B","ligado":true}, ...]
void enviaEstado(WiFiClient &cliente) {
  cliente.println("HTTP/1.1 200 OK");
  cliente.println("Content-type:application/json");
  cliente.println("Connection: close");
  cliente.println();
  cliente.print("[");
  for (int i = 0; i < TOTAL_LEDS; i++) {
    if (i > 0) cliente.print(",");
    cliente.print("{\"nome\":\"" + leds[i].nome + "\",\"cor\":\"" + leds[i].cor + "\",\"ligado\":");
    cliente.print(leds[i].ligado ? "true" : "false");
    cliente.print("}");
  }
  cliente.println("]");
}

//Programa principal ***********************
void loop() {

  //pega os dados do cliente
  WiFiClient cliente = server.available();

  //Se tiver cliente conectado
  if (cliente) {
    cliente.setTimeout(2000); //Espera no máximo 2 segundos pelos dados

    //Lê só a primeira linha do pedido. Ex.: "GET /verde/1 HTTP/1.1"
    String pedido = cliente.readStringUntil('\r');
    Serial.println(pedido);

    //Descarta o resto do pedido (cabeçalhos do navegador)
    while (cliente.available()) {
      cliente.read();
    }

    bool comando = false; //Vira true se o pedido foi para mudar ou consultar os LEDs

    //Procura qual LED foi pedido:  /nome/1 liga  e  /nome/0 desliga
    for (int i = 0; i < TOTAL_LEDS; i++) {
      if (pedido.startsWith("GET /" + leds[i].nome + "/1 ")) { mudarLed(i, true);  comando = true; }
      if (pedido.startsWith("GET /" + leds[i].nome + "/0 ")) { mudarLed(i, false); comando = true; }
    }
    //Todos de uma vez:  /todos/1  e  /todos/0
    if (pedido.startsWith("GET /todos/1 ")) { for (int i = 0; i < TOTAL_LEDS; i++) mudarLed(i, true);  comando = true; }
    if (pedido.startsWith("GET /todos/0 ")) { for (int i = 0; i < TOTAL_LEDS; i++) mudarLed(i, false); comando = true; }
    //A página pergunta como os LEDs estão
    if (pedido.startsWith("GET /estado ")) comando = true;

    if (comando) {
      enviaEstado(cliente);
    }
    //Página principal
    else if (pedido.startsWith("GET / ")) {
      cliente.println("HTTP/1.1 200 OK");
      cliente.println("Content-type:text/html; charset=utf-8");
      cliente.println("Connection: close");
      cliente.println();
      cliente.print(PAGINA);
    }
    //Qualquer outro pedido (ex.: /favicon.ico): responde para o navegador não ficar esperando
    else {
      cliente.println("HTTP/1.1 404 Not Found");
      cliente.println("Connection: close");
      cliente.println();
    }

    //Fecha a conexão (libera o ESP32 para o próximo clique)
    cliente.stop();
  }
}