CREATE DATABASE IF NOT EXISTS mavlink_db;
USE mavlink_db;

CREATE TABLE IF NOT EXISTS telemetry_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    lat DECIMAL(10, 7) NOT NULL,
    lon DECIMAL(10, 7) NOT NULL,
    alt FLOAT NOT NULL COMMENT 'Altitude in meters',
    ground_speed FLOAT NOT NULL COMMENT 'm/s',
    heading INT NOT NULL COMMENT '0-360 degrees',
    pitch FLOAT NOT NULL,
    roll FLOAT NOT NULL,
    battery_voltage FLOAT,
    gps_fix_type INT COMMENT '0-6 (0: no gps, 3: 3D fix)'
);

CREATE INDEX idx_timestamp ON telemetry_logs (timestamp);
