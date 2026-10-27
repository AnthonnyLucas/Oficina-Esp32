//COLOCA O ESP32 NA REDE WIFI COM IP FIXO
//***************************

//Para funcionar o WiFi
#include <WiFi.h>

// ===============================================================
//  ESCOLHA ONDE VAI RODAR:
//    1 = Wokwi 
//    0 = Placa física
// ===============================================================
#define USAR_WOKWI 0

#if USAR_WOKWI
  // ---------- Wokwi ----------
  const char* SSID = "Wokwi-GUEST"; //Rede simulada do Wokwi
  const char* PASSWORD = "";        //Ela não tem senha
  const int CANAL_WIFI = 6;         //Canal da rede do Wokwi (conecta mais rápido)

  //Configuração da rede (faixa do Wokwi)
  IPAddress ip(10, 10, 0, 50);      //IP fixo do ESP32 no simulador
  IPAddress gateway(10, 10, 0, 1);  //Roteador do Wokwi
#else
  // ---------- Placa física ----------
  const char* SSID = "Mateus";      //Nome da rede WI-FI que deseja se conectar
  const char* PASSWORD = "12345678"; //Senha da rede WI-FI que deseja se conectar
  const int CANAL_WIFI = 0;         //0 = procura a rede em todos os canais

  //Configuração da rede
  IPAddress ip(10, 0, 0, 175);      //ping (cada número vai de 0 a 255!)
  IPAddress gateway(10, 0, 0, 1);   //ipConfig -> "Gateway Padrão"
#endif

IPAddress subnet(255, 255, 255, 0); //Máscara (igual nos dois)
IPAddress dns(8, 8, 8, 8);          //DNS do Google (igual nos dois)

//Defino o pino que funciona o LED
//(o nome LED_BUILTIN já existe na biblioteca, por isso usamos PINO_LED)
const int PINO_LED = 2;

void setup() {
  //Definindo que o sinal irá sair para ligar o led da placa
  pinMode(PINO_LED, OUTPUT);

  //Especifico a comunicação com o monitor
  Serial.begin(9600);

  //Passo as configurações (o config vem ANTES do begin)
  WiFi.config(ip, gateway, subnet, dns);
  WiFi.begin(SSID, PASSWORD, CANAL_WIFI);

  //Conectando
  while (WiFi.status() != WL_CONNECTED) { //ENQUANTO STATUS FOR DIFERENTE DE CONECTADO
    delay(500); //INTERVALO DE 500 MILISEGUNDOS
    Serial.print("."); //ESCREVE O CARACTER NA SERIAL
  }

  //Mostrando os dados da conexão
  Serial.println(""); //PULA UMA LINHA NA JANELA SERIAL
  Serial.print("Conectado a rede sem fio "); //ESCREVE O TEXTO NA SERIAL
  Serial.println(SSID); //ESCREVE O NOME DA REDE NA SERIAL
  Serial.print("IP fixo: ");
  Serial.println(WiFi.localIP()); //ESCREVE NA SERIAL O IP DENTRO DA REDE SEM FIO
  Serial.print("Gateway: ");
  Serial.println(WiFi.gatewayIP());
}

void loop() {
  //Se estiver conectado no wifi acende o led
  if (WiFi.status() == WL_CONNECTED) {
    digitalWrite(PINO_LED, HIGH); //Acende LED
  } else { //se desconectar
    digitalWrite(PINO_LED, LOW);  //Apaga LED
  }
}