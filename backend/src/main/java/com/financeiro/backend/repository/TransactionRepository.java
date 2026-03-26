package com.financeiro.backend.repository;

import com.financeiro.backend.model.Transaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TransactionRepository extends JpaRepository<Transaction, Long> {
    List<Transaction> findAllByOrderByIdDesc();
    List<Transaction> findByDateStartingWithOrderByIdDesc(String datePrefix);
}
