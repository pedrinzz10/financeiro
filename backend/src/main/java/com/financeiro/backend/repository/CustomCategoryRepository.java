package com.financeiro.backend.repository;

import com.financeiro.backend.model.CustomCategory;
import com.financeiro.backend.model.TransactionType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CustomCategoryRepository extends JpaRepository<CustomCategory, Long> {
    List<CustomCategory> findByType(TransactionType type);
    boolean existsByNameAndType(String name, TransactionType type);
}
