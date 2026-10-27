# Guia de Execução Passo a Passo: Dashboard & ESP32
### Como Rodar a Aplicação e Conectar o Hardware Físico em 100% de Funcionamento
**Oficina ESP32 & Resilient IoT · SNCT 2026 · UFRPE / UABJ**

---

## 📋 Sumário
1. [Pré-Requisitos e Softwares Necessários](#1-pré-requisitos-e-softwares-necessários)
2. [Montagem do Circuito Físico (Hardware)](#2-montagem-do-circuito-físico-hardware)
3. [Configuração do Arduino IDE](#3-configuração-do-arduino-ide)
4. [Gravação do Código no ESP32](#4-gravação-do-código-no-esp32)
5. [Iniciando a Aplicação Web (Dashboard)](#5-iniciando-a-aplicação-web-dashboard)
6. [Conectando o ESP32 Real ao Dashboard](#6-conectando-o-esp32-real-ao-dashboard)
7. [Demonstração dos Cenários de Chaos Engineering](#7-demonstração-dos-cenários-de-chaos-engineering)
8. [Perguntas Frequentes & Resolução de Problemas](#8-perguntas-frequentes--resolução-de-problemas)

---

## 🛠️ 1. Pré-Requisitos e Softwares Necessários

Antes de iniciar, certifique-se de ter:
* **Hardware**:
  * 1x Placa ESP32 (NodeMCU, DevKit v1 de 30 ou 38 pinos).
  * 1x Sensor DHT22 (ou DHT11) de temperatura e umidade.
  * 1x Cabo Micro-USB (ou Type-C) de **dados** (não use cabos que servem apenas para recarga).
  * Fios jumper fêmea-macho ou macho-macho e protoboard.
* **Software**:
  * [Arduino IDE](https://www.arduino.cc/en/software) (versão 2.x ou 1.8.x).
  * Navegador web atualizado (Google Chrome, Microsoft Edge, Opera, Firefox).
  * Uma rede Wi-Fi local de **2.4 GHz** (pode ser o roteador de casa ou o ponto de acesso roteado pelo seu celular).

---

## 🔌 2. Montagem do Circuito Físico (Hardware)

Com a placa ESP32 desconectada do computador, faça as seguintes ligações:

```text
    +-------------------+--------------------+
    | PINO DO DHT22     | PINO DO ESP32      |
    +-------------------+--------------------+
    | VCC / (+)         | 3V3 (ou VIN / 5V)  |
    | GND / (-)         | GND                |
    | DAT / OUT / Sinal | D5 (GPIO 5)        |
    +-------------------+--------------------+
```

> **Dica**: Se estiver usando o módulo com placa azul/vermelha de 3 pinos, ele já possui o resistor pull-up embutido. Se estiver usando o sensor DHT22 solto de 4 pinos, conecte um resistor de 10kΩ entre o pino 1 (VCC) e o pino 2 (Dados).

---

## ⚙️ 3. Configuração do Arduino IDE

Se você nunca usou o ESP32 no Arduino IDE, siga estes 3 passos rápidos:

### Passo 3.1: Instalar o pacote de placas ESP32
1. Abra o Arduino IDE e clique em: **Arquivo ➔ Preferências** (ou `Ctrl + ,`).
2. No campo **URLs Adicionais para o Gerenciador de Placas**, cole a seguinte URL:
   ```text
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   ```
3. Clique em **OK**.
4. No menu lateral esquerdo, clique no ícone de Placas (**Boards Manager**), pesquise por `esp32` e clique em **Instalar** no pacote da **Espressif Systems**.

### Passo 3.2: Instalar as bibliotecas necessárias
1. No Arduino IDE, abra o **Gerenciador de Bibliotecas** (ícone de livros na lateral ou `Ctrl + Shift + I`).
2. Pesquise e instale as seguintes bibliotecas:
   * **DHT sensor library** (por Adafruit) ➔ *Se pedir para instalar dependências (como Adafruit Unified Sensor), clique em "Install All"*.
   * **PubSubClient** (por Nick O'Leary) ➔ *Para comunicação MQTT*.

---

## 🚀 4. Gravação do Código no ESP32

Para que o Dashboard consiga ler a telemetria física diretamente na rede local, usaremos o sketch com servidor HTTP integrado:

1. No Arduino IDE, abra o arquivo:
   ```text
   Oficina - ESP32 / DHT22 / DHT22.ino
   ```
2. No topo do arquivo (linhas 6 e 7), preencha o nome e a senha do seu Wi-Fi:
   ```cpp
   const char* SSID = "Nome_Do_Seu_WiFi";
   const char* PASSWORD = "Senha_Do_Seu_WiFi";
   ```
3. Se estiver usando o sensor **DHT22** (branco), verifique as linhas 11 e 12:
   ```cpp
   #define TIPO DHT22
   const char* NOME_SENSOR = "DHT22";
   #define DHTPino 5
   ```
4. Conecte o ESP32 na porta USB do computador.
5. No menu superior do Arduino IDE:
   * Selecione a placa: **DOIT ESP32 DEVKIT V1** (ou **ESP32 Dev Module**).
   * Selecione a porta correspondente: (ex: **COM3**, **COM4**, etc.).
6. Clique no botão de seta **Carregar (Upload)**.
   > **Atenção**: Se no rodapé do Arduino IDE aparecer a mensagem `Connecting........_____.....`, aperte e segure o botão **BOOT** na placa ESP32 por 2 segundos até o percentual de gravação começar a subir.
7. Quando aparecer `Done uploading`, abra o **Monitor Serial** (ícone de lupa no canto superior direito ou `Ctrl + Shift + M`).
8. Configure a velocidade do Monitor Serial para **9600 baud**.
9. O ESP32 conectará no Wi-Fi e exibirá no terminal:
   ```text
   Wi-Fi Conectado!
   Endereço IP: 192.168.1.15
   ```
   👉 **Copie ou anote esse endereço IP gerado!**

---

## 🌐 5. Iniciando a Aplicação Web (Dashboard)

A aplicação web está na pasta `dashboard_resilient_iot/`. Para melhor performance e evitar bloqueios de segurança do navegador com requisições locais (CORS), execute-a através de um servidor HTTP local.

### Opção A: Usando Python (Mais Fácil)
1. Abra o prompt de comando (CMD ou PowerShell) na pasta do projeto:
   ```powershell
   cd "c:\Users\Pichau\Desktop\Oficina - ESP32\dashboard_resilient_iot"
   ```
2. Execute o servidor HTTP nativo:
   ```powershell
   python -m http.server 8000
   ```
3. Abra o navegador e acerte a URL:
   ```text
   http://localhost:8000/#/dashboard
   ```

### Opção B: Usando Node.js / npx
1. No terminal, execute:
   ```powershell
   npx -y serve "c:\Users\Pichau\Desktop\Oficina - ESP32\dashboard_resilient_iot" -p 8000
   ```
2. Abra `http://localhost:8000` no navegador.

### Opção C: Abrindo diretamente pelo arquivo
* Você também pode simplesmente dar um duplo clique no arquivo `dashboard_resilient_iot/index.html`. O sistema funcionará com seu motor de simulação autônomo.

---

## 🔗 6. Conectando o ESP32 Real ao Dashboard

Com a Dashboard aberta no navegador e o ESP32 conectado na mesma rede Wi-Fi:

1. Na Dashboard, clique sobre o card de **Temperatura** (ou no card de **Umidade**).
2. Uma janela modal com os detalhes do sensor será aberta.
3. Na janela modal, clique na aba superior **"Configuração de Hardware"** (ou no ícone de chave inglesa).
4. No campo **Endereço IP do ESP32**, digite o endereço IP que você anotou no Monitor Serial:
   ```text
   http://192.168.1.15
   ```
   *(Substitua pelo IP real da sua placa, ex: `192.168.1.15` ou `10.0.0.175`)*.
5. Clique no botão verde **"Conectar ao ESP32 Real"**.
6. Uma mensagem em verde indicará:
   `✅ Conectado ao ESP32 real com sucesso! Sensor: DHT22`
7. Feche o modal no botão `×`.
8. Pronto! Agora o Dashboard está lendo a temperatura e umidade reais do sensor físico DHT22 em bancada a cada 2,5 segundos! Se você aproximar a mão do sensor ou assoprá-lo, verá os números subirem na hora na tela!

---

## 🧪 7. Demonstração dos Cenários de Chaos Engineering

Durante a apresentação ou oficina aos alunos:

1. No menu lateral esquerdo, clique em **Chaos Engineering** (ou acesse `#/chaos`).
2. O painel lateral direito de controle de falhas irá deslizar na tela.
3. **Simulação 1: Falha no Wi-Fi / MQTT**:
   * Clique em **"Falhar MQTT"**.
   * Observe que o nó Mosquitto na topologia fica vermelho e offline.
   * As partículas verdes param de circular por ele e o fluxo de dados migra instantaneamente para o **Caminho B (LoRaWAN)** com partículas na cor âmbar.
   * Clique em **"Restaurar MQTT"** para demonstrar o failback e a volta automática da rota principal.
4. **Simulação 2: Blackout Total e Store-and-Forward**:
   * Clique em **"Blackout Total"** na seção de Cenários.
   * Tanto o MQTT quanto o LoRa caem ao mesmo tempo.
   * Mostre aos alunos que as leituras nos sensores continuam ocorrendo, mas os pacotes não conseguem sair para a rede.
   * Observe os contadores de **Buffer** nos cards de dispositivos subindo (dados sendo represados em memória Flash local).
   * Clique em **"Blackout Total"** novamente para desligar a falha: o sistema aciona o **Flush**, enviando uma rajada acelerada de partículas que descarrega todo o buffer acumulado para o servidor central `SRV-01` e normaliza a taxa de entrega para 100%!
5. **Simulação 3: Tempestade Climática**:
   * Clique em **"Tempestade"** para injetar atenuação de radiofrequência severa e descarte de pacotes (~35%), mostrando a degradação da taxa de entrega e os logs de timeout.

---

## ❓ 8. Perguntas Frequentes & Resolução de Problemas

* **O ESP32 não conecta no Wi-Fi**:
  * Certifique-se de que o Wi-Fi está operando na frequência de **2.4 GHz**. O ESP32 não é compatível com redes exclusivamente de 5 GHz.
* **O Dashboard dá erro ao tentar conectar no IP do ESP32**:
  * Verifique se o seu computador e o ESP32 estão conectados **na mesma rede Wi-Fi**.
  * Teste abrir o endereço no navegador do computador: `http://SEU_IP/dados`. Ele deve responder um texto JSON com a temperatura e umidade.
* **Leituras marcando `NaN` ou `0.0`**:
  * Verifique se o pino de dados do sensor está bem firme no pino **D5** (GPIO 5) e se os cabos de alimentação (3V3 e GND) não estão invertidos.
* **Como testar sem o hardware físico?**:
  * A Dashboard funciona perfeitamente sem nenhuma placa conectada! O motor interno gera amostragem browniana realista e permite demonstrar todas as telas, pipelines e experimentos de Chaos Engineering de forma totalmente independente.
