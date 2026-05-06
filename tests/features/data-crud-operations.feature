@feature_id:c8f99c67-129e-49f4-ad35-5d650ee20d38
@epic_id:f9974422-9d0d-4aa3-b952-3e9c156333b2
Feature: Data CRUD Operations
  Create basic functionality for users to perform CRUD operations on their data.

  @scenario_id:9f24df65-2a8a-471d-a430-9ecc4ef95e8d
  @scenario_type:UI
  @ui_test
  Scenario: Users can create, read, update, and delete records for leads and workflows
    # Scenario ID: 9f24df65-2a8a-471d-a430-9ecc4ef95e8d
    # Feature ID: c8f99c67-129e-49f4-ad35-5d650ee20d38
    # Scenario Type: UI
    # Description: Users can create, read, update, and delete records for leads and workflows
    Given User is logged into the Kiana Realty Growth Platform
    When User navigates to the leads section
    And User creates a new lead
    And User reads the newly created lead
    And User updates the lead's information
    And User deletes the lead
    Then The user should see the lead successfully created
    And The user should see the lead details correctly displayed
    And The user should see the lead information updated
    And The user should see a confirmation that the lead was deleted
    # Priority: medium
    # Status: draft
    # Test Runner Info: feature_id=c8f99c67-129e-49f4-ad35-5d650ee20d38, scenario_id=9f24df65-2a8a-471d-a430-9ecc4ef95e8d, type=UI

  @scenario_id:00978b54-e93c-4743-a5c9-e62515ff4df9
  @scenario_type:UI
  @ui_test
  Scenario: Data integrity is maintained through operations
    # Scenario ID: 00978b54-e93c-4743-a5c9-e62515ff4df9
    # Feature ID: c8f99c67-129e-49f4-ad35-5d650ee20d38
    # Scenario Type: UI
    # Description: Data integrity is maintained through operations
    Given User is logged into the Kiana Realty Growth Platform
    When User creates a new lead with specific data
    And User updates the lead with valid changes
    And User reads the lead details
    And User deletes the lead
    Then Data remains consistent and accurate throughout the operations
    And No unintended data loss occurs during updates and deletions
    # Priority: high
    # Status: draft
    # Test Runner Info: feature_id=c8f99c67-129e-49f4-ad35-5d650ee20d38, scenario_id=00978b54-e93c-4743-a5c9-e62515ff4df9, type=UI

  @scenario_id:5e9f6e6a-b2f1-414d-8bf8-a8462eb7cb2c
  @scenario_type:UI
  @ui_test
  Scenario: Users receive feedback after each operation
    # Scenario ID: 5e9f6e6a-b2f1-414d-8bf8-a8462eb7cb2c
    # Feature ID: c8f99c67-129e-49f4-ad35-5d650ee20d38
    # Scenario Type: UI
    # Description: Users receive feedback after each operation
    Given User is logged into the Kiana Realty Growth Platform
    When User creates a new lead
    And User updates the lead
    And User deletes the lead
    Then The user should receive a confirmation message for lead creation
    And The user should receive a confirmation message for lead update
    And The user should receive a confirmation message for lead deletion
    # Priority: medium
    # Status: draft
    # Test Runner Info: feature_id=c8f99c67-129e-49f4-ad35-5d650ee20d38, scenario_id=5e9f6e6a-b2f1-414d-8bf8-a8462eb7cb2c, type=UI
