//Bibliotecas de rede, servidor e sensor
#include <WiFi.h>
#include <WebServer.h>
#include <DHT.h>

const char* SSID = "Mateus"; //Nome da rede WI-FI que deseja se conectar
const char* PASSWORD = "12345678"; //Senha da rede WI-FI que deseja se conectar

//Definindo o tipo do sensor e a porta de dados
//Se usar o DHT22, troque as duas linhas abaixo: DHT22 e "DHT22"
#define TIPO DHT11
const char* NOME_SENSOR = "DHT11"; //Nome que aparece na página
#define DHTPino 5

//Acima dessa temperatura a página mostra alerta de calor
const float LIMITE_CALOR = 30.0;

//Cria objeto do sensor e do servidor
DHT dht(DHTPino, TIPO);
WebServer server(80);

//Últimos valores lidos (o sensor só pode ser lido a cada 2 segundos)
float temperatura = NAN;
float umidade = NAN;
float sensacao = NAN;
bool sensorOk = false;
unsigned long ultimaLeitura = 0;

//Página do site (com o símbolo da SNCT desenhado em SVG, não precisa de internet)
//Depois de aberta, o próprio navegador pede só os números em /dados
const char PAGINA[] PROGMEM = R"rawliteral(
<!DOCTYPE html><html lang="pt-br"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Estação · 23ª SNCT</title>
<style>
:root{--fundo:#23266E;--fundo2:#2F3390;--card:rgba(255,255,255,.08);--branco:#FFFFFF;--rosa:#EC4B87;
--menta:#9FE2C5;--amarelo:#FFC845;--quente:#FF8A65;--azul:#6FC3FF}
*{box-sizing:border-box;margin:0}
body{min-height:100vh;font-family:system-ui,"Segoe UI",Roboto,sans-serif;color:var(--branco);
background:radial-gradient(circle at 85% 10%,var(--fundo2),var(--fundo) 60%);
background-color:var(--fundo);display:flex;flex-direction:column;align-items:center;padding:20px 16px}
body:before{content:"";position:fixed;inset:0;pointer-events:none;
background-image:radial-gradient(rgba(255,255,255,.07) 1.5px,transparent 1.5px);background-size:22px 22px}
header{display:flex;align-items:center;gap:14px;width:100%;max-width:640px;position:relative}
header svg{width:96px;flex:none}
header h1{font-size:22px;line-height:1.15}
header p{font-size:13px;opacity:.75;margin-top:4px}
.painel{position:relative;width:100%;max-width:640px;margin-top:22px;padding:22px 16px;border-radius:26px;
background:var(--card);border:1px solid rgba(255,255,255,.14)}
.estrela{position:absolute;top:-18px;right:-10px;width:60px;transform:rotate(12deg)}
.titulo{text-align:center;font-size:15px;opacity:.8;margin-bottom:16px}
.titulo b{color:var(--menta)}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px}
.card{background:rgba(255,255,255,.07);border-radius:20px;padding:18px 20px;border:2px solid transparent;
transition:border-color .3s}
.rot{display:flex;align-items:center;gap:8px;font-size:15px;opacity:.85}
.rot svg{width:22px;height:22px}
.valor{font-size:58px;font-weight:800;margin:4px 0 8px;color:var(--amarelo);transition:color .3s}
.umid .valor{color:var(--azul)}
.valor small{font-size:24px;font-weight:500;color:var(--branco);opacity:.75}
.barra{height:10px;background:rgba(0,0,0,.25);border-radius:6px;overflow:hidden}
.barra div{height:100%;width:0;background:var(--amarelo);border-radius:6px;transition:width .6s,background .3s}
.umid .barra div{background:var(--azul)}
.extra{margin-top:12px;font-size:14px;opacity:.8}
.quente{border-color:var(--quente);box-shadow:0 0 24px rgba(255,138,101,.35)}
.quente .valor{color:var(--quente)}
.quente .barra div{background:var(--quente)}
.status{display:block;width:max-content;max-width:100%;margin:18px auto 6px;padding:10px 22px;border-radius:999px;
font-weight:700;background:rgba(255,255,255,.12)}
.status.alerta{background:var(--rosa)}
.hora{text-align:center;font-size:13px;opacity:.65}
.pulso{display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--menta);margin-right:6px}
.pisca{animation:p .8s}
@keyframes p{from{transform:scale(2.2);opacity:.2}}
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
    <h1>Estação do ESP32</h1>
    <p>Oficina ESP32 + MQTT · 23ª Semana Nacional de Ciência e Tecnologia</p>
  </div>
</header>

<main class="painel">
  <svg class="estrela" viewBox="0 0 100 100"><path d="M50 0Q58 42 100 50Q58 58 50 100Q42 58 0 50Q42 42 50 0Z" fill="#EC4B87"/></svg>
  <div class="titulo">Sensor <b id="sensor">DHT</b> · atualiza sozinho a cada 3 s</div>

  <div class="cards">
    <div class="card" id="cardT">
      <div class="rot">
        <svg viewBox="0 0 24 24" fill="none" stroke="#FFC845" stroke-width="2" stroke-linecap="round">
          <path d="M14 14.8V5a2 2 0 0 0-4 0v9.8a4 4 0 1 0 4 0z"/></svg>
        Temperatura
      </div>
      <div class="valor"><span id="t">--</span><small> °C</small></div>
      <div class="barra"><div id="bt"></div></div>
      <div class="extra">Sensação térmica: <b id="s">--</b> °C</div>
    </div>
    <div class="card umid">
      <div class="rot">
        <svg viewBox="0 0 24 24" fill="none" stroke="#6FC3FF" stroke-width="2" stroke-linejoin="round">
          <path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/></svg>
        Umidade do ar
      </div>
      <div class="valor"><span id="u">--</span><small> %</small></div>
      <div class="barra"><div id="bu"></div></div>
      <div class="extra" id="du">--</div>
    </div>
  </div>

  <div class="status" id="st">Conectando...</div>
  <div class="hora"><span class="pulso" id="pl"></span>Última leitura: <span id="hr">--</span></div>
</main>

<footer>Engenharia da Computação · UFRPE/UABJ<br>Sensor no pino D5 do ESP32</footer>

<script>
const $ = id => document.getElementById(id);
async function atualizar() {
  try {
    const d = await (await fetch('/dados')).json();
    $('sensor').textContent = d.sensor;
    if (!d.ok) { $('st').textContent = '⚠️ Erro ao ler o sensor (confira os fios)'; return; }

    $('t').textContent = d.t.toFixed(1);
    $('u').textContent = d.u.toFixed(1);
    $('s').textContent = d.s.toFixed(1);
    $('bt').style.width = Math.min(Math.max(d.t / 50 * 100, 0), 100) + '%';
    $('bu').style.width = Math.min(Math.max(d.u, 0), 100) + '%';
    $('du').textContent = d.u < 30 ? 'Ar seco' : d.u <= 60 ? 'Umidade confortável' : 'Ar úmido';

    const quente = d.t > d.lim;
    $('cardT').classList.toggle('quente', quente);
    $('st').classList.toggle('alerta', quente);
    $('st').textContent = quente ? '🔥 Alerta: acima de ' + d.lim + ' °C' : '✅ Temperatura normal';

    $('hr').textContent = new Date().toLocaleTimeString('pt-BR');
    $('pl').classList.remove('pisca'); void $('pl').offsetWidth; $('pl').classList.add('pisca');
  } catch (e) {
    $('st').textContent = '📡 Sem conexão com o ESP32';
  }
}
atualizar();
setInterval(atualizar, 3000);
</script>
</body></html>
)rawliteral";

void setup() {
  Serial.begin(9600);

  //Fica em loop até conectar
  WiFi.begin(SSID, PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
      delay(100);
      Serial.print(".");
  }

  //Mensagem caso conexao Ok
  Serial.println("");
  Serial.println(F("Conectado na rede Wifi."));
  Serial.print(F("Abra no navegador: http://"));
  Serial.println(WiFi.localIP());

  //Inicia o sensor
  dht.begin();

  //Endereços do site
  server.on("/", aoConectar);        //a página
  server.on("/dados", enviaDados);   //só os números (JSON)
  server.onNotFound(naoEncontrado);  //qualquer outro pedido (ex.: /favicon.ico)
  server.begin();
}

void loop() {
  //Fica aguardando o navegador
  server.handleClient();

  //Lê o sensor a cada 2 segundos
  if (millis() - ultimaLeitura >= 2000) {
    ultimaLeitura = millis();
    lerSensor();
  }
}

//Lê o sensor e guarda os valores
void lerSensor() {
  float t = dht.readTemperature(); // Obtém os valores da temperatura
  float u = dht.readHumidity();    // Obtém os valores da umidade

  if (isnan(t) || isnan(u)) {
    sensorOk = false;
    Serial.println("Falha ao ler o sensor!");
    return;
  }

  temperatura = t;
  umidade = u;
  sensacao = dht.computeHeatIndex(t, u, false); //Sensação térmica em °C
  sensorOk = true;

  Serial.print("Temperatura: ");
  Serial.print(temperatura, 1);
  Serial.print(" °C | Umidade: ");
  Serial.print(umidade, 1);
  Serial.println(" %");
}

//Após receber o pedido do navegador: manda a página
void aoConectar() {
  server.send(200, "text/html; charset=utf-8", PAGINA);
}

void enviaDados() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "*");
  String json = "{\"sensor\":\"" + String(NOME_SENSOR) + "\",\"ok\":";
  json += (sensorOk ? "true" : "false");
  if (sensorOk) {
    json += ",\"t\":" + String(temperatura, 1);
    json += ",\"u\":" + String(umidade, 1);
    json += ",\"s\":" + String(sensacao, 1);
  }
  json += ",\"lim\":" + String(LIMITE_CALOR, 1);
  json += "}";
  server.send(200, "application/json", json);
}

//Responde qualquer endereço desconhecido, para o navegador não ficar esperando
void naoEncontrado() {
  server.send(404, "text/plain", "Nao encontrado");
}