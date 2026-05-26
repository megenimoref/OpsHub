-- MySQL Schema for CRM
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'staff') NOT NULL DEFAULT 'staff',
  totpSecret VARCHAR(255) DEFAULT NULL,
  totpEnabled TINYINT(1) NOT NULL DEFAULT 0,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS people (
  id INT AUTO_INCREMENT PRIMARY KEY,
  firstName VARCHAR(100) NOT NULL,
  lastName VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  battalion VARCHAR(100) NOT NULL,
  userId INT NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_userId (userId),
  INDEX idx_battalion (battalion),
  INDEX idx_name (firstName, lastName)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS financial_calculations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  soldier_personal_number VARCHAR(50) NOT NULL,
  soldier_name VARCHAR(200),
  battalion VARCHAR(100) NOT NULL,
  reserve_days INT NOT NULL,
  estimated_compensation INT NOT NULL,
  daily_average FLOAT NOT NULL,
  months_json TEXT NOT NULL,
  notes TEXT,
  calculated_by_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_personal_number (soldier_personal_number),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS whatsapp_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  soldier_personal_number VARCHAR(50) NOT NULL,
  soldier_name VARCHAR(200),
  battalion VARCHAR(100),
  phone VARCHAR(50) NOT NULL,
  message_preview VARCHAR(160) NOT NULL,
  sent_by_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_personal_number (soldier_personal_number),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS distribution_list (
  id INT AUTO_INCREMENT PRIMARY KEY,
  soldier_personal_number VARCHAR(50) NOT NULL UNIQUE,
  soldier_name VARCHAR(200) NOT NULL,
  battalion VARCHAR(100) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  added_by_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_personal_number (soldier_personal_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert admin user (password: admin123)
INSERT INTO users (email, password, role) VALUES
('admin@crm.com', '$2a$10$9rgnVUJFpjyPoN9nMAGMk.WJDNYeBZPtiJ9PClo5AOTfhlp01URTi', 'admin');

-- Insert sample people
INSERT INTO people (firstName, lastName, email, phone, battalion, userId) VALUES
('ישראל', 'כהן', 'israel.cohen@example.com', '0501234567', 'גולני', 1),
('דוד', 'לוי', 'david.levi@example.com', '0502345678', 'גבעותי', 1);
