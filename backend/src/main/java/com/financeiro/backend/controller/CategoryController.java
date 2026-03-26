package com.financeiro.backend.controller;

import com.financeiro.backend.model.CustomCategory;
import com.financeiro.backend.model.TransactionType;
import com.financeiro.backend.repository.CustomCategoryRepository;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/categories")
public class CategoryController {

    private static final List<String> DEFAULT_INCOME = Arrays.asList(
        "Salario", "Freelance", "Investimentos", "Vendas", "Outros"
    );
    private static final List<String> DEFAULT_EXPENSE = Arrays.asList(
        "Alimentacao", "Transporte", "Moradia", "Saude", "Educacao", "Lazer", "Roupas", "Contas", "Outros"
    );

    private final CustomCategoryRepository repository;

    public CategoryController(CustomCategoryRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public Map<String, Object> getAll() {
        List<CustomCategory> customIncome = repository.findByType(TransactionType.income);
        List<CustomCategory> customExpense = repository.findByType(TransactionType.expense);

        List<String> incomeNames = new ArrayList<>(DEFAULT_INCOME);
        for (CustomCategory c : customIncome) incomeNames.add(c.getName());

        List<String> expenseNames = new ArrayList<>(DEFAULT_EXPENSE);
        for (CustomCategory c : customExpense) expenseNames.add(c.getName());

        Map<String, Object> result = new HashMap<>();
        result.put("income", incomeNames);
        result.put("expense", expenseNames);
        result.put("customIncome", customIncome);
        result.put("customExpense", customExpense);
        return result;
    }

    @PostMapping
    public ResponseEntity<?> create(@Valid @RequestBody CustomCategory category) {
        if (repository.existsByNameAndType(category.getName(), category.getType())) {
            return ResponseEntity.badRequest().body(Map.of("error", "Categoria ja existe"));
        }
        // Check if it's a default category
        List<String> defaults = category.getType() == TransactionType.income ? DEFAULT_INCOME : DEFAULT_EXPENSE;
        if (defaults.contains(category.getName())) {
            return ResponseEntity.badRequest().body(Map.of("error", "Categoria padrao ja existe"));
        }
        return ResponseEntity.ok(repository.save(category));
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
