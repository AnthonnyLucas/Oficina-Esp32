// ==========================================================================
// OFICINA ESP32 + MQTT · 23ª SEMANA NACIONAL DE CIÊNCIA E TECNOLOGIA (SNCT)
// Engenharia da Computação · UFRPE / UABJ
// Publicador de Telemetria DHT22 para Broker MQTT (Mosquitto)
// ==========================================================================

#include <DHT.h>
#include <PubSubClient.h> // Instalar biblioteca "PubSubClient" no Arduino IDE
#include <WiFi.h>

// ---------------- CONFIGURAÇÃO WI-FI ----------------
const char *SSID =
    "Mateus"; // Nome da sua rede Wi-Fi (ou "Wokwi-GUEST" no simulador)
const char *PASSWORD = "12345678"; // Senha do Wi-Fi

// ---------------- CONFIGURAÇÃO MQTT -----------------
// Você pode usar o Mosquitto local na sua máquina ou um broker público para
// testes:
const char *BROKER_MQTT =
    "broker.hivemq.com"; // ou IP do seu Mosquitto: "10.0.0.100"
const int PORTA_MQTT = 1883;
const char *TOPICO_TELEMETRIA = "oficina/snct/dev01/telemetria";
const char *TOPICO_COMANDOS = "oficina/snct/dev01/comandos";
const char *CLIENT_ID = "ESP32_DEV01_UABJ";

// ---------------- CONFIGURAÇÃO SENSOR DHT22 ---------
#define DHTPIN 5 // Pino digital onde o sinal do DHT está conectado (GPIO 5)
#define DHTTYPE DHT22 // Tipo do sensor: DHT22 (AM2302) ou DHT11
DHT dht(DHTPIN, DHTTYPE);

// ---------------- ATUADORES (LEDS) ------------------
const int PINO_LED_STATUS = 2; // LED interno do ESP32 (indica conexão MQTT)
const int PINO_LED_VERDE = 26; // LED de controle via MQTT

WiFiClient espClient;
PubSubClient client(espClient);

unsigned long ultimaLeitura = 0;
const unsigned long INTERVALO_LEITURA =
    2000; // DHT22 requer no mínimo 2 segundos entre leituras
unsigned long contadorPacotes = 0;

void setup() {
  pinMode(PINO_LED_STATUS, OUTPUT);
  pinMode(PINO_LED_VERDE, OUTPUT);
  digitalWrite(PINO_LED_STATUS, LOW);
  digitalWrite(PINO_LED_VERDE, LOW);

  Serial.begin(9600);
  Serial.println("\n--- Iniciando DEV-01: ESP32 + MQTT (SNCT 2026) ---");

  dht.begin();
  conectarWiFi();

  client.setServer(BROKER_MQTT, PORTA_MQTT);
  client.setCallback(aoReceberMensagem);
}

void loop() {
  if (!client.connected()) {
    reconectarMQTT();
  }
  client.loop(); // Mantém o keep-alive e processa mensagens recebidas

  unsigned long agora = millis();
  if (agora - ultimaLeitura >= INTERVALO_LEITURA) {
    ultimaLeitura = agora;
    lerEPublicarDados();
  }
}

// Conexão à rede Wi-Fi
void conectarWiFi() {
  Serial.print("Conectando ao Wi-Fi: ");
  Serial.println(SSID);
  WiFi.begin(SSID, PASSWORD);

  while (WiFi.status() != WL_CONNECTED) {
    delay(200);
    Serial.print(".");
  }

  Serial.println("\nWi-Fi Conectado!");
  Serial.print("Endereço IP: ");
  Serial.println(WiFi.localIP());
}

// Reconexão ao Broker MQTT com tentativas não-bloqueantes
void reconectarMQTT() {
  while (!client.connected()) {
    Serial.print("Tentando conexao com Broker MQTT (");
    Serial.print(BROKER_MQTT);
    Serial.print(")... ");

    if (client.connect(CLIENT_ID)) {
      Serial.println("Conectado com sucesso!");
      digitalWrite(PINO_LED_STATUS, HIGH); // LED aceso = conectado ao broker
      client.subscribe(TOPICO_COMANDOS);
      Serial.print("Inscrito no topico de comandos: ");
      Serial.println(TOPICO_COMANDOS);
    } else {
      Serial.print("Falha, rc=");
      Serial.print(client.state());
      Serial.println(". Nova tentativa em 3 segundos...");
      digitalWrite(PINO_LED_STATUS, LOW);
      delay(3000);
    }
  }
}

// Callback: disparado quando o ESP32 recebe comando vindo do Broker MQTT
void aoReceberMensagem(char *topic, byte *payload, unsigned int length) {
  String mensagem = "";
  for (unsigned int i = 0; i < length; i++) {
    mensagem += (char)payload[i];
  }
  Serial.print("Comando recebido em [");
  Serial.print(topic);
  Serial.print("]: ");
  Serial.println(mensagem);

  // Exemplo de comando: "1" liga o LED verde, "0" desliga
  if (mensagem == "1" || mensagem == "LIGAR") {
    digitalWrite(PINO_LED_VERDE, HIGH);
    Serial.println(">> LED Ativado via MQTT");
  } else if (mensagem == "0" || mensagem == "DESLIGAR") {
    digitalWrite(PINO_LED_VERDE, LOW);
    Serial.println(">> LED Desativado via MQTT");
  }
}

// Faz a leitura do sensor e monta o payload JSON para publicação
void lerEPublicarDados() {
  float t = dht.readTemperature();
  float u = dht.readHumidity();

  if (isnan(t) || isnan(u)) {
    Serial.println("Aviso: Falha ao ler sensor DHT22!");
    return;
  }

  float sensacao = dht.computeHeatIndex(t, u, false);
  contadorPacotes++;

  // Formata o payload exatamente de acordo com o contrato da Dashboard
  // Resilient IoT
  String payload = "{";
  payload += "\"device_id\":\"DEV-01\",";
  payload += "\"seq\":" + String(contadorPacotes) + ",";
  payload += "\"sensors\":{";
  payload += "\"temperature\":" + String(t, 1) + ",";
  payload += "\"humidity\":" + String(u, 1) + ",";
  payload += "\"heat_index\":" + String(sensacao, 1) + ",";
  payload += "\"status\":\"OK\"";
  payload += "},";
  payload += "\"network\":{";
  payload += "\"ip\":\"" + WiFi.localIP().toString() + "\",";
  payload += "\"rssi\":" + String(WiFi.RSSI()) + ",";
  payload += "\"path\":\"PATH_A_MQTT\"";
  payload += "}}";

  Serial.print("Publicando [");
  Serial.print(TOPICO_TELEMETRIA);
  Serial.print("]: ");
  Serial.println(payload);

  client.publish(TOPICO_TELEMETRIA, payload.c_str());
}
