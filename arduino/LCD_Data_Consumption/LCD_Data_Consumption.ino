#include <Arduino.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClient.h>
#include <Arduino_JSON.h>

const char* ssid = "xxx";
const char* password = "xxx";
String httpServer = "http://192.168.31.239:7500/";

LiquidCrystal_I2C lcd(0x27,16,2); // set the LCD address to 0x27 for a 16 chars and 2 line display

void setup() {
  // Serial configuration
  Serial.begin(115200);
  // LCD initialization
  lcd.init();
  lcd.backlight();
  lcd.setCursor(0,0);
  lcd.print("Iniciando...");
}

void loop() {
  // The data is updated hourly
  delay(3600000);
  Serial.println("Inside the loop...");

  // Starts by establishing a Wi-Fi connection
  WiFi.begin(ssid, password);
  int delayLoops = 0;
  while(WiFi.status() != WL_CONNECTED) {
    delay(500);
    delayLoops ++;
    if (delayLoops > 100) {
      Serial.println("Error Wi-Fi: " + WiFi.status());
      lcd.clear();
      lcd.setCursor(0,0);
      lcd.print("Error Wi-Fi");
      lcd.setCursor(0,1);
      lcd.print("Codigo: " + String(WiFi.status()));
      return;
    }
  }

  // Sends a GET request to the server
  HTTPClient http;
  String serverPath = httpServer + "stats";
  http.begin(serverPath.c_str());
  http.setTimeout(60000);
  int httpResponseCode = http.GET();
  if (httpResponseCode != 200) {
    Serial.println("Error HTTP, código: " + String(httpResponseCode));
    lcd.clear();
    lcd.setCursor(0,0);
    lcd.print("Error HTTP");
    lcd.setCursor(0,1);
    lcd.print("Codigo: " + String(httpResponseCode));
    return;
  }

  // Parses the JSON response from the server
  String payload = http.getString();
  Serial.println(payload);
  JSONVar payloadJSON = JSON.parse(payload);
  boolean success = payloadJSON["success"];
  Serial.println(success);
  if (!success) {
    Serial.println("Error respuesta");
    lcd.clear();
    lcd.setCursor(0,0);
    lcd.print("Error respuesta");
    return;
  }
  int daysUntilNextCycle = payloadJSON["result"]["daysUntilNextCycle"];
  int limitData = payloadJSON["result"]["limitDataFormatted"];
  int spentData = payloadJSON["result"]["spentDataFormatted"];

  lcd.clear();
  lcd.setCursor(0,0);
  lcd.print("Datos: " + String(spentData) + "/" + String(limitData) + "GB");
  lcd.setCursor(0,1);
  lcd.print("Reinicio en: " + String(daysUntilNextCycle) + "d");
  http.end();
}