@feature_id:f09b7b51-2c0f-4734-ba1e-3e57b7245031
@epic_id:f9974422-9d0d-4aa3-b952-3e9c156333b2
Feature: User Registration
  Facilitate user sign-ups with essential details, ensuring a smooth onboarding process.

  @scenario_id:c9623cfa-18ed-4261-9954-bb1256ad3090
  @scenario_type:UI
  @ui_test
  Scenario: Users can register using email and password
    # Scenario ID: c9623cfa-18ed-4261-9954-bb1256ad3090
    # Feature ID: f09b7b51-2c0f-4734-ba1e-3e57b7245031
    # Scenario Type: UI
    # Description: Users can register using email and password
    Given User is on the registration page
    When User enters a valid email and password
    Then User successfully registers and is redirected to the welcome page
    # Priority: medium
    # Status: draft
    # Test Runner Info: feature_id=f09b7b51-2c0f-4734-ba1e-3e57b7245031, scenario_id=c9623cfa-18ed-4261-9954-bb1256ad3090, type=UI

  @scenario_id:c9f424ce-9477-4a62-9fd6-f8899e119684
  @scenario_type:UI
  @ui_test
  Scenario: User registration form validates input fields correctly
    # Scenario ID: c9f424ce-9477-4a62-9fd6-f8899e119684
    # Feature ID: f09b7b51-2c0f-4734-ba1e-3e57b7245031
    # Scenario Type: UI
    # Description: User registration form validates input fields correctly
    Given User is on the registration page
    When User submits the registration form with invalid data
    Then User sees validation error messages for the input fields
    # Priority: medium
    # Status: draft
    # Test Runner Info: feature_id=f09b7b51-2c0f-4734-ba1e-3e57b7245031, scenario_id=c9f424ce-9477-4a62-9fd6-f8899e119684, type=UI

  @scenario_id:54ac0518-a690-4f1b-b058-591989f38587
  @scenario_type:API
  @api_test
  Scenario: Confirmation email is sent after successful registration
    # Scenario ID: 54ac0518-a690-4f1b-b058-591989f38587
    # Feature ID: f09b7b51-2c0f-4734-ba1e-3e57b7245031
    # Scenario Type: API
    # Description: Confirmation email is sent after successful registration
    Given User has successfully registered
    When User checks their email inbox
    Then User finds a confirmation email in their inbox
    # Priority: medium
    # Status: draft
    # Test Runner Info: feature_id=f09b7b51-2c0f-4734-ba1e-3e57b7245031, scenario_id=54ac0518-a690-4f1b-b058-591989f38587, type=API

  @scenario_id:162fb5c0-32bb-4a2c-9076-55573faca838
  @scenario_type:UI
  @ui_test
  Scenario: Users can log in using registered credentials
    # Scenario ID: 162fb5c0-32bb-4a2c-9076-55573faca838
    # Feature ID: f09b7b51-2c0f-4734-ba1e-3e57b7245031
    # Scenario Type: UI
    # Description: Users can log in using registered credentials
    Given User is on the login page
    When User enters valid registered email and password
    Then User successfully logs in and is redirected to the dashboard
    # Priority: medium
    # Status: draft
    # Test Runner Info: feature_id=f09b7b51-2c0f-4734-ba1e-3e57b7245031, scenario_id=162fb5c0-32bb-4a2c-9076-55573faca838, type=UI
