package com.example.expensetracker;

import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/expenses")
@CrossOrigin(origins = "*") // allow all for dev; lock down for production
public class ExpenseController {

    private final ExpenseRepository repo;

    public ExpenseController(ExpenseRepository repo) {
        this.repo = repo;
    }

    // GET /api/expenses
    @GetMapping
    public List<Expense> listAll() {
        return repo.findAll();
    }

    // GET /api/expenses/{id}
    @GetMapping("/{id}")
    public ResponseEntity<Expense> getById(@PathVariable String id) {
        Optional<Expense> e = repo.findById(id);
        return e.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

    // POST /api/expenses
    @PostMapping
    public ResponseEntity<Expense> create(@RequestBody Expense expense) {
        // ensure id is null so Mongo generates one
        expense.setId(null);
        Expense saved = repo.save(expense);
        return new ResponseEntity<>(saved, HttpStatus.CREATED);
    }

    // PUT /api/expenses/{id}  -> update (for edit feature)
    @PutMapping("/{id}")
    public ResponseEntity<Expense> update(@PathVariable String id, @RequestBody Expense updated) {
        return repo.findById(id).map(existing -> {
            existing.setAmount(updated.getAmount());
            existing.setCategory(updated.getCategory());
            existing.setDescription(updated.getDescription());
            existing.setDate(updated.getDate());
            Expense saved = repo.save(existing);
            return ResponseEntity.ok(saved);
        }).orElseGet(() -> ResponseEntity.notFound().build());
    }

    // DELETE /api/expenses/{id}
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        if (!repo.existsById(id)) return ResponseEntity.notFound().build();
        repo.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    // DELETE /api/expenses  -> clear all (optional)
    @DeleteMapping
    public ResponseEntity<Void> deleteAll() {
        repo.deleteAll();
        return ResponseEntity.noContent().build();
    }
}
