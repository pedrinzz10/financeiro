package com.financeiro.backend.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

@Entity
@Table(name = "custom_categories")
public class CustomCategory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    private String name;

    @NotNull
    @Enumerated(EnumType.STRING)
    private TransactionType type;

    public CustomCategory() {}

    public CustomCategory(String name, TransactionType type) {
        this.name = name;
        this.type = type;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public TransactionType getType() { return type; }
    public void setType(TransactionType type) { this.type = type; }
}
