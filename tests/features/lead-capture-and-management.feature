@feature_id:997aab12-fb4d-4a23-be0f-4af8542366dc
@epic_id:f9974422-9d0d-4aa3-b952-3e9c156333b2
Feature: Lead Capture and Management
  System for capturing inbound leads and converting them into structured workflows.

  @scenario_id:dcf0b1da-5a80-4226-9e24-af19562c5c52
  @scenario_type:UI
  @ui_test
  Scenario: Leads can be captured from multiple sources.
    # Scenario ID: dcf0b1da-5a80-4226-9e24-af19562c5c52
    # Feature ID: 997aab12-fb4d-4a23-be0f-4af8542366dc
    # Scenario Type: UI
    # Description: Leads can be captured from multiple sources.
    Given The user is on the lead capture page.
    When The user submits a lead form from a website.
    And The user submits a lead form from social media.
    And The user submits a lead form via a mobile app.
    Then The system captures and stores the lead information from all sources.
    # Priority: high
    # Status: draft
    # Test Runner Info: feature_id=997aab12-fb4d-4a23-be0f-4af8542366dc, scenario_id=dcf0b1da-5a80-4226-9e24-af19562c5c52, type=UI

  @scenario_id:9dedfe71-bfc9-4480-974c-0563d47d382d
  @scenario_type:UI
  @ui_test
  Scenario: Leads are stored in a structured format.
    # Scenario ID: 9dedfe71-bfc9-4480-974c-0563d47d382d
    # Feature ID: 997aab12-fb4d-4a23-be0f-4af8542366dc
    # Scenario Type: UI
    # Description: Leads are stored in a structured format.
    Given The system has received lead information from various sources.
    When The user accesses the lead database.
    Then The leads are displayed in a structured format with all required fields filled.
    # Priority: high
    # Status: draft
    # Test Runner Info: feature_id=997aab12-fb4d-4a23-be0f-4af8542366dc, scenario_id=9dedfe71-bfc9-4480-974c-0563d47d382d, type=UI

  @scenario_id:10516dae-3689-428d-91ca-1e6b9ecf7acf
  @scenario_type:UI
  @ui_test
  Scenario: Users can view and manage leads in the system.
    # Scenario ID: 10516dae-3689-428d-91ca-1e6b9ecf7acf
    # Feature ID: 997aab12-fb4d-4a23-be0f-4af8542366dc
    # Scenario Type: UI
    # Description: Users can view and manage leads in the system.
    Given The user is logged into the lead management system.
    When The user navigates to the leads management section.
    Then The user can view all leads and perform management actions (edit, delete, assign) on them.
    # Priority: high
    # Status: draft
    # Test Runner Info: feature_id=997aab12-fb4d-4a23-be0f-4af8542366dc, scenario_id=10516dae-3689-428d-91ca-1e6b9ecf7acf, type=UI
