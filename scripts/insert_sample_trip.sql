DO $$
DECLARE
    v_company_id BIGINT;
    v_driver_id BIGINT;
    v_vehicle_id BIGINT;
    v_plant_id BIGINT;
    v_site_id BIGINT;
    v_order_id BIGINT;
BEGIN
    SELECT company_id
    INTO v_company_id
    FROM transport_companies
    WHERE organization_number = '999888777';

    IF v_company_id IS NULL THEN
        INSERT INTO transport_companies (
            name,
            organization_number,
            contact_email,
            contact_phone
        )
        VALUES (
            'Eksempel Transport AS',
            '999888777',
            'post@eksempeltransport.no',
            '+4740000000'
        )
        RETURNING company_id INTO v_company_id;
    END IF;

    SELECT driver_id
    INTO v_driver_id
    FROM drivers
    WHERE company_id = v_company_id
      AND full_name = 'Test Sjafor'
    ORDER BY driver_id DESC
    LIMIT 1;

    IF v_driver_id IS NULL THEN
        INSERT INTO drivers (
            company_id,
            full_name,
            phone,
            license_class,
            is_active
        )
        VALUES (
            v_company_id,
            'Test Sjafor',
            '+4740000001',
            'CE',
            TRUE
        )
        RETURNING driver_id INTO v_driver_id;
    END IF;

    SELECT vehicle_id
    INTO v_vehicle_id
    FROM vehicles
    WHERE registration_number = 'ZZ12345';

    IF v_vehicle_id IS NULL THEN
        INSERT INTO vehicles (
            company_id,
            registration_number,
            vehicle_type,
            payload_capacity_tons,
            is_active
        )
        VALUES (
            v_company_id,
            'ZZ12345',
            'truck',
            20.00,
            TRUE
        )
        RETURNING vehicle_id INTO v_vehicle_id;
    END IF;

    SELECT plant_id
    INTO v_plant_id
    FROM asphalt_plants
    WHERE name = 'Eksempel Asfaltverk'
    ORDER BY plant_id DESC
    LIMIT 1;

    IF v_plant_id IS NULL THEN
        INSERT INTO asphalt_plants (
            name,
            address_line,
            city,
            latitude,
            longitude
        )
        VALUES (
            'Eksempel Asfaltverk',
            'Industriveien 1',
            'Oslo',
            59.910000,
            10.750000
        )
        RETURNING plant_id INTO v_plant_id;
    END IF;

    SELECT site_id
    INTO v_site_id
    FROM delivery_sites
    WHERE name = 'Eksempel Byggeplass'
    ORDER BY site_id DESC
    LIMIT 1;

    IF v_site_id IS NULL THEN
        INSERT INTO delivery_sites (
            name,
            address_line,
            city,
            latitude,
            longitude,
            planned_start_date
        )
        VALUES (
            'Eksempel Byggeplass',
            'Anleggsveien 2',
            'Oslo',
            59.920000,
            10.760000,
            CURRENT_DATE
        )
        RETURNING site_id INTO v_site_id;
    END IF;

    SELECT order_id
    INTO v_order_id
    FROM transport_orders
    WHERE order_number = 'ORD-EX-1001';

    IF v_order_id IS NULL THEN
        INSERT INTO transport_orders (
            order_number,
            company_id,
            source_plant_id,
            destination_site_id,
            asphalt_type,
            planned_tonnage,
            delivered_tonnage,
            priority,
            status,
            window_start,
            window_end
        )
        VALUES (
            'ORD-EX-1001',
            v_company_id,
            v_plant_id,
            v_site_id,
            'ABb 11',
            100.00,
            0.00,
            3,
            'in_progress',
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP + INTERVAL '8 hours'
        )
        RETURNING order_id INTO v_order_id;
    END IF;

    INSERT INTO trips (
        order_id,
        vehicle_id,
        driver_id,
        trip_sequence,
        planned_departure_at,
        loaded_at,
        departed_plant_at,
        arrived_site_at,
        unloaded_at,
        returned_at,
        loaded_weight_tons,
        delivered_weight_tons,
        status,
        notes,
        ticket_number
    )
    VALUES (
        v_order_id,
        v_vehicle_id,
        v_driver_id,
        1,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP + INTERVAL '35 minutes',
        CURRENT_TIMESTAMP + INTERVAL '55 minutes',
        CURRENT_TIMESTAMP + INTERVAL '80 minutes',
        18.50,
        18.20,
        'closed',
        'Eksempelrad lagt inn via script',
        'TICKET-EX-0001'
    )
    ON CONFLICT (order_id, trip_sequence)
    DO UPDATE
    SET ticket_number = EXCLUDED.ticket_number,
        notes = EXCLUDED.notes,
        delivered_weight_tons = EXCLUDED.delivered_weight_tons,
        status = EXCLUDED.status;
END $$;
