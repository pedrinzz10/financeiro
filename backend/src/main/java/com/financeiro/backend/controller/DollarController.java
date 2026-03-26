package com.financeiro.backend.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestTemplate;

@RestController
@RequestMapping("/api/dollar")
public class DollarController {

    @GetMapping
    public ResponseEntity<String> getDollarRate() {
        try {
            RestTemplate restTemplate = new RestTemplate();
            String url = "https://economia.awesomeapi.com.br/json/last/USD-BRL";
            String response = restTemplate.getForObject(url, String.class);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("{\"error\": \"Erro ao buscar cotacao\"}");
        }
    }
}
