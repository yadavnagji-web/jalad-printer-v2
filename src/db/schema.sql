-- Smart QR Print — PostgreSQL Production Schema & Migrations
-- Covers all tables for Shop settings, Printers, Pricing, Orders, Documents, Transactions & Audit Logs

CREATE TABLE IF NOT EXISTS admin_users (
    id VARCHAR(64) PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'owner',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS shop_settings (
    id VARCHAR(64) PRIMARY KEY DEFAULT 'default_shop',
    shop_name VARCHAR(255) NOT NULL,
    shop_logo TEXT,
    shop_address TEXT,
    mobile_number VARCHAR(30) NOT NULL,
    whatsapp_number VARCHAR(30) NOT NULL,
    shop_upi_id VARCHAR(100) NOT NULL,
    opening_hours VARCHAR(100),
    customer_instructions TEXT,
    support_contact VARCHAR(100),
    default_paper_size VARCHAR(20) DEFAULT 'A4',
    default_print_quality VARCHAR(20) DEFAULT 'standard',
    default_printer VARCHAR(100),
    supported_paper_sizes JSONB DEFAULT '["A4", "A3", "PHOTO_4X6", "PASSPORT_SHEET"]'::jsonb,
    max_file_size_mb INTEGER DEFAULT 50,
    document_retention_hours INTEGER DEFAULT 24,
    auto_print_enabled BOOLEAN DEFAULT true,
    shop_url TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pricing_rules (
    id VARCHAR(64) PRIMARY KEY DEFAULT 'default_pricing',
    bw_single_a4 NUMERIC(10, 2) NOT NULL DEFAULT 2.00,
    bw_duplex_a4 NUMERIC(10, 2) NOT NULL DEFAULT 3.50,
    color_single_a4 NUMERIC(10, 2) NOT NULL DEFAULT 10.00,
    color_duplex_a4 NUMERIC(10, 2) NOT NULL DEFAULT 18.00,
    bw_single_a3 NUMERIC(10, 2) NOT NULL DEFAULT 5.00,
    color_single_a3 NUMERIC(10, 2) NOT NULL DEFAULT 20.00,
    photo_4x6 NUMERIC(10, 2) NOT NULL DEFAULT 25.00,
    passport_sheet NUMERIC(10, 2) NOT NULL DEFAULT 50.00,
    min_order_amount NUMERIC(10, 2) NOT NULL DEFAULT 5.00,
    service_charge NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS printer_configurations (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    brand VARCHAR(50) NOT NULL, -- 'Epson' or 'HP'
    model VARCHAR(100) NOT NULL,
    is_default BOOLEAN DEFAULT false,
    status VARCHAR(30) DEFAULT 'online',
    supported_color BOOLEAN DEFAULT false,
    supported_duplex BOOLEAN DEFAULT false,
    supported_paper_sizes JSONB,
    assigned_job_types JSONB,
    last_heartbeat TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customer_orders (
    id VARCHAR(64) PRIMARY KEY,
    order_number VARCHAR(100) UNIQUE NOT NULL,
    customer_name VARCHAR(150),
    customer_phone VARCHAR(30),
    subtotal NUMERIC(10, 2) NOT NULL,
    tax NUMERIC(10, 2) DEFAULT 0.00,
    total_amount NUMERIC(10, 2) NOT NULL,
    payment_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'paid', 'failed', 'counter_pending'
    payment_method VARCHAR(50) NOT NULL, -- 'upi_qr', 'upi_intent', 'gateway_razorpay', 'counter_cash'
    payment_txn_id VARCHAR(150),
    paid_at TIMESTAMP WITH TIME ZONE,
    print_status VARCHAR(50) DEFAULT 'pending_payment', -- 'pending_payment', 'queued', 'downloading', 'printing', 'completed', 'failed'
    assigned_printer_id VARCHAR(64) REFERENCES printer_configurations(id),
    assigned_printer_name VARCHAR(255),
    retry_count INTEGER DEFAULT 0,
    failure_reason TEXT,
    counter_operator VARCHAR(100),
    verified_hash_match BOOLEAN DEFAULT true,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_files (
    id VARCHAR(64) PRIMARY KEY,
    order_id VARCHAR(64) REFERENCES customer_orders(id) ON DELETE CASCADE,
    original_file_name VARCHAR(255) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    sha256_hash CHAR(64) NOT NULL, -- SHA-256 cryptographic hash of source file
    storage_path TEXT NOT NULL,
    page_count INTEGER NOT NULL DEFAULT 1,
    dimensions JSONB,
    effective_dpi INTEGER,
    quality_recommendation VARCHAR(20),
    is_official_id_doc BOOLEAN DEFAULT false,
    paper_size VARCHAR(30) NOT NULL,
    orientation VARCHAR(20) DEFAULT 'portrait',
    page_range VARCHAR(100) DEFAULT 'all',
    copies INTEGER DEFAULT 1,
    color_mode VARCHAR(20) DEFAULT 'bw',
    duplex BOOLEAN DEFAULT false,
    scaling_mode VARCHAR(30) DEFAULT 'actual_size',
    calculated_price NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payment_transactions (
    id VARCHAR(64) PRIMARY KEY,
    order_id VARCHAR(64) REFERENCES customer_orders(id),
    order_number VARCHAR(100) NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    method VARCHAR(50) NOT NULL,
    status VARCHAR(30) NOT NULL,
    gateway_ref VARCHAR(150) NOT NULL,
    operator VARCHAR(100),
    verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(64) PRIMARY KEY,
    actor VARCHAR(100) NOT NULL,
    action VARCHAR(100) NOT NULL,
    details TEXT NOT NULL,
    ip_address VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_orders_number ON customer_orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_status ON customer_orders(print_status, payment_status);
CREATE INDEX IF NOT EXISTS idx_files_hash ON order_files(sha256_hash);
