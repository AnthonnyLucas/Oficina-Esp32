//***************************
//CONTROLA UM LED PELO NAVEGADOR, COM INFORMAÇÕES DE REDE JÁ INCLUSAS
//***************************

#include <WiFi.h>

const char* SSID = "matheus"; //Nome da rede WI-FI que deseja se conectar
const char* PASSWORD = "12345678"; //Senha da rede WI-FI que deseja se conectar

//Define o pino do led (D5)
int pino_led = 5;

//Defino a porta do servidor Web
WiFiServer server(80);

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
      Serial.println(".");
  } 
  //Mostro o IP obtido no monitor
  Serial.println("IP obtido: ");
  Serial.println(WiFi.localIP());

  //Inicia o servidor web
  server.begin(); 
}

//Programa principal ***********************
void loop() {

  //pega os dados do cliente
  WiFiClient cliente = server.available();

  //Se tiver cliente conectado
  if (cliente) {
    String dados = ""; //Variável para guardar os dados vindos da web 
    while (cliente.connected()) { 
      if (cliente.available()) {  
        char c = cliente.read();
        dados += c;      

        //Se recebeu 1 na url
        if (dados.endsWith("GET /1")) {
          Serial.println("liga");
          digitalWrite(pino_led,HIGH); //Liga o led
          cliente.println("HTTP/1.1 200 OK");
          cliente.println("Content-type:text/html");
          cliente.println();
          cliente.stop();
        }

        //Se recebeu 0 na url
        if (dados.endsWith("GET /0")) {
          Serial.println("desliga");
          digitalWrite(pino_led,LOW); //Desliga o led
          cliente.println("HTTP/1.1 200 OK");
          cliente.println("Content-type:text/html");
          cliente.println();
          cliente.stop();
        }
      }
    }  
  }

}