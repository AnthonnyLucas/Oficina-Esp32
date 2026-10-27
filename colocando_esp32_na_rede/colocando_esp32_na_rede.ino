//COLOCA O ESP32 NA REDE WIFI
//***************************

//Para funcionar o WiFi
#include <WiFi.h>

// WOKWI: no simulador, a rede se chama "Wokwi-GUEST" e não tem senha
//const char* SSID = "Wokwi-GUEST"; //Nome da rede WI-FI que deseja se conectar
//const char* PASSWORD = "";        //Senha da rede WI-FI que deseja se conectar

const char* SSID = "Mateus";
const char* PASSWORD = "12345678";

//Configurações iniciais ******************* --> roda apenas uma vez, quando você incia ele
void setup() {
  //Especifico a comunicação com o monitor

  Serial.begin(9600); // velocidade de comunicação com o monitor

  //Fica em loop até conectar
  WiFi.begin(SSID, PASSWORD, 6); // WOKWI: o 6 é o canal da rede do Wokwi (conecta mais rápido)
  while (WiFi.status() != WL_CONNECTED) {
      delay(100);
      Serial.println(".");
  } 
  //Mostro o IP obtido no monitor
  Serial.println("IP obtido: ");
  Serial.println(WiFi.localIP());
}

//Programa principal ***********************
void loop() {


}