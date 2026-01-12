package mysql

import (
	"context"
	"database/sql"

	"github.com/RealistikOsu/soumetsu/internal/config"
	_ "github.com/go-sql-driver/mysql"
	"github.com/jmoiron/sqlx"
)

// DB wraps sqlx.DB to provide a consistent interface.
type DB struct {
	*sqlx.DB
}

// New creates a new MySQL database connection.
func New(cfg config.DatabaseConfig) (*DB, error) {
	db, err := sqlx.Open("mysql", cfg.DSN())
	if err != nil {
		return nil, err
	}

	if err := db.Ping(); err != nil {
		return nil, err
	}

	return &DB{DB: db}, nil
}

// QueryRowContext executes a query that returns at most one row.
func (db *DB) QueryRowContext(ctx context.Context, query string, args ...any) *sql.Row {
	return db.DB.QueryRowContext(ctx, query, args...)
}

// QueryContext executes a query that returns rows.
func (db *DB) QueryContext(ctx context.Context, query string, args ...any) (*sql.Rows, error) {
	return db.DB.QueryContext(ctx, query, args...)
}

// ExecContext executes a query without returning any rows.
func (db *DB) ExecContext(ctx context.Context, query string, args ...any) (sql.Result, error) {
	return db.DB.ExecContext(ctx, query, args...)
}

// GetContext using sqlx for struct scanning.
func (db *DB) GetContext(ctx context.Context, dest any, query string, args ...any) error {
	return db.DB.GetContext(ctx, dest, query, args...)
}

// SelectContext using sqlx for slice scanning.
func (db *DB) SelectContext(ctx context.Context, dest any, query string, args ...any) error {
	return db.DB.SelectContext(ctx, dest, query, args...)
}

// BeginTx starts a transaction.
func (db *DB) BeginTx(ctx context.Context, opts *sql.TxOptions) (*Tx, error) {
	tx, err := db.DB.BeginTxx(ctx, opts)
	if err != nil {
		return nil, err
	}
	return &Tx{Tx: tx}, nil
}

// Tx wraps sqlx.Tx to provide a consistent interface.
type Tx struct {
	*sqlx.Tx
}

// Commit commits the transaction.
func (tx *Tx) Commit() error {
	return tx.Tx.Commit()
}

// Rollback aborts the transaction.
func (tx *Tx) Rollback() error {
	return tx.Tx.Rollback()
}

// QueryRowContext executes a query that returns at most one row within the transaction.
func (tx *Tx) QueryRowContext(ctx context.Context, query string, args ...any) *sql.Row {
	return tx.Tx.QueryRowContext(ctx, query, args...)
}

// ExecContext executes a query without returning any rows within the transaction.
func (tx *Tx) ExecContext(ctx context.Context, query string, args ...any) (sql.Result, error) {
	return tx.Tx.ExecContext(ctx, query, args...)
}
