-- Create CRM user with necessary permissions
-- Run this as root user in MySQL
-- Password: 1qaz!QAZ

-- Create user if not exists
CREATE USER IF NOT EXISTS 'crm_user'@'%' IDENTIFIED BY '1qaz!QAZ';
CREATE USER IF NOT EXISTS 'crm_user'@'localhost' IDENTIFIED BY '1qaz!QAZ';

-- Grant all privileges on crm database
GRANT ALL PRIVILEGES ON crm.* TO 'crm_user'@'%';
GRANT ALL PRIVILEGES ON crm.* TO 'crm_user'@'localhost';

-- Grant database creation privileges (needed for battalion databases)
GRANT CREATE, ALTER, DROP, GRANT OPTION ON *.* TO 'crm_user'@'%';
GRANT CREATE, ALTER, DROP, GRANT OPTION ON *.* TO 'crm_user'@'localhost';

-- Apply privileges
FLUSH PRIVILEGES;
