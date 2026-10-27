# Plataforma Resilient IoT — SNCT 2026 (UFRPE / UABJ)

Dashboard interativa de observabilidade e espelhamento de topologia de rede IoT, monitoramento do sensor **DHT22** (Temperatura e Umidade) e transmissão multiprotocolo (**MQTT / LoRaWAN**).

---

## 🚀 Como Executar

### Opção 1: Direto no Navegador (Simulador Autônomo)
1. Dê um duplo clique no arquivo [`index.html`](index.html) para abrir no seu navegador favorito (Chrome, Edge, Firefox, Opera).
2. A simulação em tempo real iniciará automaticamente com:
   * **Topologia de Rede Dinâmica:** Fluxo de pacotes animados viajando pelos caminhos de comunicação até os clientes finais (`Analista`, `Gerência`, `Técnico`, `Estranho`).
   * **Interatividade nos Sensores:** Clique em qualquer nó de sensor (**Temp**, **Umid**, **Lux**) ou nos cartões do topo para abrir a **Inspeção Detalhada do DHT22** (valores exatos, barras de nível, cálculo de sensação térmica, tabela de especificações do sensor e payload MQTT gerado em JSON).
   * **Simulação de Chaos Engineering:** Clique no botão *"Simular Queda de Wi-Fi / Failover"* para ver a rede comutar automaticamente para a rota de contingência **LoRaWAN (Caminho B)**.
   * **Console de Logs:** Rastreamento de pacotes com identificadores hexadecimais e filtros por tipo.

---

### Opção 2: Conectando com o ESP32 Físico ou Simulador Wokwi
1. Grave o código [`DHT22/DHT22.ino`](../DHT22/DHT22.ino) ou execute no Wokwi.
2. Abra a dashboard e clique no ícone de engrenagem/conexão no topo direito ou abra a aba **"Conectar ESP32 Real"** no modal do sensor.
3. Insira o endereço IP exibido no Monitor Serial do ESP32 (exemplo: `http://10.0.0.175`) e clique em **Conectar ao ESP32**.
4. A dashboard passará a ler e espelhar as medições reais de temperatura e umidade da placa física!

---

### Opção 3: Publicação Direta via Broker MQTT
Para enviar dados reais para um broker MQTT (Mosquitto local ou público):
* Utilize o sketch [`esp32_mqtt_dht22/esp32_mqtt_dht22.ino`](../esp32_mqtt_dht22/esp32_mqtt_dht22.ino).
* Ele conecta ao Wi-Fi e publica a cada 2 segundos no tópico `oficina/snct/dev01/telemetria`.
