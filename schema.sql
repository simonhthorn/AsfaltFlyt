-- AsfaltFlyt: grunnleggende databaseskjema for sporing av asfalttransport
-- SQL-dialekt: PostgreSQL-kompatibel

CREATE TABLE transport_companies (
    company_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name TEXT NOT NULL,
    organization_number VARCHAR(20) UNIQUE,
    contact_email TEXT,
    contact_phone TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE app_users (
    user_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    company_id BIGINT REFERENCES transport_companies(company_id) ON DELETE SET NULL,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role VARCHAR(30) NOT NULL CHECK (role IN ('admin', 'dispatcher', 'site_manager', 'viewer')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE drivers (
    driver_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    company_id BIGINT NOT NULL REFERENCES transport_companies(company_id) ON DELETE RESTRICT,
    full_name TEXT NOT NULL,
    phone TEXT,
    license_class VARCHAR(20),
    hired_date DATE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE vehicles (
    vehicle_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    company_id BIGINT NOT NULL REFERENCES transport_companies(company_id) ON DELETE RESTRICT,
    registration_number VARCHAR(20) NOT NULL UNIQUE,
    vehicle_type VARCHAR(30) NOT NULL CHECK (vehicle_type IN ('truck', 'truck_trailer', 'semi')),
    payload_capacity_tons NUMERIC(6,2) NOT NULL CHECK (payload_capacity_tons > 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE asphalt_plants (
    plant_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name TEXT NOT NULL,
    address_line TEXT,
    city TEXT,
    latitude NUMERIC(9,6) CHECK (latitude BETWEEN -90 AND 90),
    longitude NUMERIC(9,6) CHECK (longitude BETWEEN -180 AND 180),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE delivery_sites (
    site_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name TEXT NOT NULL,
    address_line TEXT,
    city TEXT,
    latitude NUMERIC(9,6) CHECK (latitude BETWEEN -90 AND 90),
    longitude NUMERIC(9,6) CHECK (longitude BETWEEN -180 AND 180),
    planned_start_date DATE,
    planned_end_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE transport_orders (
    order_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_number VARCHAR(50) NOT NULL UNIQUE,
    company_id BIGINT NOT NULL REFERENCES transport_companies(company_id) ON DELETE RESTRICT,
    source_plant_id BIGINT NOT NULL REFERENCES asphalt_plants(plant_id) ON DELETE RESTRICT,
    destination_site_id BIGINT NOT NULL REFERENCES delivery_sites(site_id) ON DELETE RESTRICT,
    asphalt_type VARCHAR(60) NOT NULL,
    planned_tonnage NUMERIC(8,2) NOT NULL CHECK (planned_tonnage > 0),
    delivered_tonnage NUMERIC(8,2) NOT NULL DEFAULT 0 CHECK (delivered_tonnage >= 0),
    priority SMALLINT NOT NULL DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
    status VARCHAR(30) NOT NULL DEFAULT 'planned'
        CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled')),
    window_start TIMESTAMPTZ,
    window_end TIMESTAMPTZ,
    created_by BIGINT REFERENCES app_users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (window_end IS NULL OR window_start IS NULL OR window_end >= window_start),
    CHECK (delivered_tonnage <= planned_tonnage * 1.20)
);

CREATE TABLE trips (
    trip_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id BIGINT NOT NULL REFERENCES transport_orders(order_id) ON DELETE CASCADE,
    vehicle_id BIGINT NOT NULL REFERENCES vehicles(vehicle_id) ON DELETE RESTRICT,
    driver_id BIGINT NOT NULL REFERENCES drivers(driver_id) ON DELETE RESTRICT,
    trip_sequence INTEGER NOT NULL CHECK (trip_sequence > 0),
    planned_departure_at TIMESTAMPTZ,
    loaded_at TIMESTAMPTZ,
    departed_plant_at TIMESTAMPTZ,
    arrived_site_at TIMESTAMPTZ,
    unloaded_at TIMESTAMPTZ,
    returned_at TIMESTAMPTZ,
    loaded_weight_tons NUMERIC(8,2) CHECK (loaded_weight_tons > 0),
    delivered_weight_tons NUMERIC(8,2) CHECK (delivered_weight_tons >= 0),
    status VARCHAR(30) NOT NULL DEFAULT 'assigned'
        CHECK (status IN ('assigned', 'loading', 'en_route', 'arrived', 'unloaded', 'closed', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (order_id, trip_sequence)
);

CREATE TABLE trip_status_history (
    trip_status_history_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    trip_id BIGINT NOT NULL REFERENCES trips(trip_id) ON DELETE CASCADE,
    status VARCHAR(30) NOT NULL
        CHECK (status IN ('assigned', 'loading', 'en_route', 'arrived', 'unloaded', 'closed', 'cancelled')),
    changed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    changed_by BIGINT REFERENCES app_users(user_id) ON DELETE SET NULL,
    comment TEXT
);

CREATE TABLE trip_gps_positions (
    gps_position_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    trip_id BIGINT NOT NULL REFERENCES trips(trip_id) ON DELETE CASCADE,
    recorded_at TIMESTAMPTZ NOT NULL,
    latitude NUMERIC(9,6) NOT NULL CHECK (latitude BETWEEN -90 AND 90),
    longitude NUMERIC(9,6) NOT NULL CHECK (longitude BETWEEN -180 AND 180),
    speed_kmh NUMERIC(5,2) CHECK (speed_kmh >= 0),
    heading_degrees NUMERIC(5,2) CHECK (heading_degrees >= 0 AND heading_degrees < 360)
);

CREATE TABLE driver_delivery_confirmations (
    confirmation_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    trip_number INTEGER NOT NULL CHECK (trip_number > 0),
    flow_step TEXT NOT NULL,
    action_label TEXT NOT NULL,
    confirmed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    gps_online BOOLEAN NOT NULL DEFAULT TRUE,
    last_deviation TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_drivers_company_id ON drivers(company_id);
CREATE INDEX idx_vehicles_company_id ON vehicles(company_id);
CREATE INDEX idx_orders_company_id ON transport_orders(company_id);
CREATE INDEX idx_orders_status ON transport_orders(status);
CREATE INDEX idx_trips_order_id ON trips(order_id);
CREATE INDEX idx_trips_driver_id ON trips(driver_id);
CREATE INDEX idx_trips_vehicle_id ON trips(vehicle_id);
CREATE INDEX idx_trip_status_history_trip_id ON trip_status_history(trip_id);
CREATE INDEX idx_trip_status_history_changed_at ON trip_status_history(changed_at);
CREATE INDEX idx_trip_gps_positions_trip_time ON trip_gps_positions(trip_id, recorded_at);
CREATE INDEX idx_delivery_confirmations_confirmed_at ON driver_delivery_confirmations(confirmed_at DESC);
CREATE INDEX idx_delivery_confirmations_trip_number ON driver_delivery_confirmations(trip_number);
