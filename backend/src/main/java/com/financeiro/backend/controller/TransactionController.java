package com.financeiro.backend.controller;

import com.financeiro.backend.model.Transaction;
import com.financeiro.backend.repository.TransactionRepository;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/transactions")
public class TransactionController {

    private final TransactionRepository repository;

    public TransactionController(TransactionRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public List<Transaction> getAll() {
        return repository.findAllByOrderByIdDesc();
    }

    @GetMapping("/month/{yearMonth}")
    public List<Transaction> getByMonth(@PathVariable String yearMonth) {
        return repository.findByDateStartingWithOrderByIdDesc(yearMonth);
    }

    @PostMapping
    public Transaction create(@Valid @RequestBody Transaction transaction) {
        return repository.save(transaction);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        if (!repository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        repository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
