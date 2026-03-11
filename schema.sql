-- PostgreSQL Schema for ITIL Change Management System (CMS)

CREATE TABLE IF NOT EXISTS Roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS Users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    contact_number VARCHAR(20),
    department VARCHAR(100),
    role_id INT REFERENCES Roles(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ChangeRequests (
    id SERIAL PRIMARY KEY,
    cr_id VARCHAR(50) UNIQUE NOT NULL, -- Format: AAI-CR-YYYY-XXXX
    requester_id INT REFERENCES Users(id) ON DELETE CASCADE,
    project_department VARCHAR(150),
    description TEXT NOT NULL,
    reason TEXT NOT NULL,
    planned_start TIMESTAMP NOT NULL,
    planned_end TIMESTAMP NOT NULL,
    priority VARCHAR(10) CHECK (priority IN ('P1', 'P2', 'P3')),
    impacted_users_apps TEXT,
    status VARCHAR(50) DEFAULT 'Submitted',
    implementation_plan_path VARCHAR(255),
    rollback_plan_path VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ApprovalHistory (
    id SERIAL PRIMARY KEY,
    cr_id INT REFERENCES ChangeRequests(id) ON DELETE CASCADE,
    role_id INT REFERENCES Roles(id) ON DELETE CASCADE,
    user_id INT REFERENCES Users(id) ON DELETE CASCADE,
    action VARCHAR(20) CHECK (action IN ('Approve', 'Reject', 'Send Back')),
    comments TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ImplementationDetails (
    id SERIAL PRIMARY KEY,
    cr_id INT REFERENCES ChangeRequests(id) ON DELETE CASCADE UNIQUE,
    actual_start TIMESTAMP,
    actual_end TIMESTAMP,
    status VARCHAR(20) CHECK (status IN ('Successful', 'Failed', 'Pending')),
    remarks TEXT,
    rca_path VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS AuditLogs (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES Users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id INT,
    ip_address VARCHAR(50),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS Notifications (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES Users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Trigger to auto-update updated_at for Users
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_modtime
BEFORE UPDATE ON Users
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_cr_modtime
BEFORE UPDATE ON ChangeRequests
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();
