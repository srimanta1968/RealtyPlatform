-- property_db — initial schema
-- Owner: services/property-service

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  type VARCHAR(50) NOT NULL,
  city VARCHAR(100) NOT NULL,
  locality VARCHAR(100) NOT NULL,
  bedrooms INTEGER NOT NULL,
  carpet_area_sqft INTEGER NOT NULL,
  list_price_minor BIGINT NOT NULL,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS properties_city_idx ON properties (city);
CREATE INDEX IF NOT EXISTS properties_published_idx ON properties (is_published);
