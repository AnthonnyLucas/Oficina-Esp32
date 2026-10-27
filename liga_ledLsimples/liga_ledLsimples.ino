//***************************
//CONTROLA UM LED PELO NAVEGADOR
//***************************

#include <WiFi.h>

const char* SSID = "Mateus"; //Nome da rede WI-FI que deseja se conectar
const char* PASSWORD = "12345678"; //Senha da rede WI-FI que deseja se conectar

//Define o pino do led (D5)
int pino_led = 5;
bool led_ligado = false; //Guarda o estado do led para mostrar na página

//Defino a porta do servidor Web
WiFiServer server(80);

//Página do site (com o símbolo da SNCT desenhado em SVG, não precisa de internet)
const char PAGINA[] PROGMEM = R"rawliteral(
<!DOCTYPE html><html lang="pt-br"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>LED · 23ª SNCT</title>
<style>
:root{--fundo:#23266E;--fundo2:#2F3390;--card:rgba(255,255,255,.08);--branco:#FFFFFF;--rosa:#EC4B87;
--menta:#9FE2C5;--amarelo:#FFC845;--led:#FF3B3B}
*{box-sizing:border-box;margin:0}
body{min-height:100vh;font-family:system-ui,"Segoe UI",Roboto,sans-serif;color:var(--branco);
background:radial-gradient(circle at 85% 10%,var(--fundo2),var(--fundo) 60%);
background-color:var(--fundo);display:flex;flex-direction:column;align-items:center;padding:20px 16px}
body:before{content:"";position:fixed;inset:0;pointer-events:none;
background-image:radial-gradient(rgba(255,255,255,.07) 1.5px,transparent 1.5px);background-size:22px 22px}
header{display:flex;align-items:center;gap:14px;width:100%;max-width:420px;position:relative}
header svg{width:96px;flex:none}
header h1{font-size:22px;line-height:1.15}
header p{font-size:13px;opacity:.75;margin-top:4px}
.card{position:relative;width:100%;max-width:420px;margin-top:22px;padding:26px 22px 28px;border-radius:26px;
background:var(--card);border:1px solid rgba(255,255,255,.14);text-align:center;backdrop-filter:blur(4px)}
.estrela{position:absolute;top:-18px;right:-10px;width:64px;transform:rotate(12deg)}
#led{width:120px;height:200px;display:block;margin:4px auto 6px;overflow:visible}
#cupula{fill:#5A1F2A;transition:fill .25s}
#brilho{opacity:0;transition:opacity .25s}
.on #cupula{fill:var(--led)}
.on #brilho{opacity:1}
.on #led{filter:drop-shadow(0 0 22px rgba(255,59,59,.85))}
.estado{font-size:15px;opacity:.75}
.estado b{display:block;font-size:34px;letter-spacing:2px;margin-top:2px;opacity:1}
.on .estado b{color:var(--amarelo)}
.chave{margin:22px auto 0;width:180px;height:76px;border-radius:40px;border:0;cursor:pointer;position:relative;
background:rgba(255,255,255,.18);transition:background .25s}
.chave:after{content:"";position:absolute;top:8px;left:8px;width:60px;height:60px;border-radius:50%;
background:var(--branco);box-shadow:0 4px 10px rgba(0,0,0,.3);transition:left .25s}
.on .chave{background:var(--rosa)}
.on .chave:after{left:112px}
.dica{font-size:13px;opacity:.6;margin-top:10px}
.botoes{display:flex;gap:12px;justify-content:center;margin-top:18px}
.botoes button{flex:1;max-width:150px;padding:14px;border:0;border-radius:14px;font-size:17px;font-weight:700;
cursor:pointer;color:var(--fundo)}
.ligar{background:var(--menta)}
.desligar{background:rgba(255,255,255,.85)}
.erro{color:var(--amarelo);font-size:14px;margin-top:14px;min-height:18px}
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

<main class="card" id="painel">
  <svg class="estrela" viewBox="0 0 100 100"><path d="M50 0Q58 42 100 50Q58 58 50 100Q42 58 0 50Q42 42 50 0Z" fill="#EC4B87"/></svg>

  <svg id="led" viewBox="0 0 120 200">
    <circle id="brilho" cx="60" cy="58" r="58" fill="rgba(255,90,90,.25)"/>
    <path id="cupula" d="M28 118V54a32 32 0 0 1 64 0v64z"/>
    <rect x="22" y="114" width="76" height="12" rx="3" fill="#8E2A36"/>
    <path d="M40 104V58a20 20 0 0 1 12-18" stroke="#fff" stroke-width="6" stroke-linecap="round" fill="none" opacity=".45"/>
    <g stroke="#C9CDD4" stroke-width="6" stroke-linecap="round" fill="none">
      <path d="M48 126v70"/><path d="M72 126v40l8 10v14"/>
    </g>
  </svg>

  <div class="estado">O LED está<b id="txt">--</b></div>

  <button class="chave" id="chave" aria-label="Liga ou desliga o LED"></button>
  <div class="dica">toque na chave para ligar ou desligar</div>

  <div class="botoes">
    <button class="ligar" onclick="enviar('/1')">Ligar</button>
    <button class="desligar" onclick="enviar('/0')">Desligar</button>
  </div>
  <div class="erro" id="erro"></div>
</main>

<footer>Engenharia da Computação · UFRPE/UABJ<br>LED no pino D5 do ESP32</footer>

<script>
let ligado = false;
function mostrar(estado) {
  ligado = estado;
  document.getElementById('painel').classList.toggle('on', ligado);
  document.getElementById('txt').textContent = ligado ? 'LIGADO' : 'DESLIGADO';
}
async function enviar(caminho) {
  try {
    const r = await fetch(caminho);
    const d = await r.json();
    mostrar(d.led);
    document.getElementById('erro').textContent = '';
  } catch (e) {
    document.getElementById('erro').textContent = 'Sem resposta do ESP32. Tente de novo.';
  }
}
document.getElementById('chave').onclick = () => enviar(ligado ? '/0' : '/1');
enviar('/estado');
</script>
</body></html>
)rawliteral";

//Configurações iniciais *******************
void setup() {
  //Pino de saída para ligar led
  pinMode(pino_led, OUTPUT);
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

//Responde com o estado do LED em JSON. Ex.: {"led":true}
void enviaEstado(WiFiClient &cliente) {
  cliente.println("HTTP/1.1 200 OK");
  cliente.println("Content-type:application/json");
  cliente.println("Connection: close");
  cliente.println();
  cliente.print("{\"led\":");
  cliente.print(led_ligado ? "true" : "false");
  cliente.println("}");
}

//Programa principal ***********************
void loop() {

  //pega os dados do cliente
  WiFiClient cliente = server.available();

  //Se tiver cliente conectado
  if (cliente) {
    cliente.setTimeout(2000); //Espera no máximo 2 segundos pelos dados

    //Lê só a primeira linha do pedido. Ex.: "GET /1 HTTP/1.1"
    String pedido = cliente.readStringUntil('\r');
    Serial.println(pedido);

    //Descarta o resto do pedido (cabeçalhos do navegador)
    while (cliente.available()) {
      cliente.read();
    }

    //Se recebeu 1 na url: liga
    if (pedido.startsWith("GET /1 ")) {
      Serial.println("liga");
      digitalWrite(pino_led, HIGH);
      led_ligado = true;
      enviaEstado(cliente);
    }
    //Se recebeu 0 na url: desliga
    else if (pedido.startsWith("GET /0 ")) {
      Serial.println("desliga");
      digitalWrite(pino_led, LOW);
      led_ligado = false;
      enviaEstado(cliente);
    }
    //A página pergunta como o LED está
    else if (pedido.startsWith("GET /estado ")) {
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