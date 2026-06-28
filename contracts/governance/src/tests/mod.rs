//! FUZZ APPROACH: Option A — proptest
//! Rationale: This module wires together our test helpers, defining a reliable baseline environment for our state machine and property fuzzers to execute against.

#![cfg(test)]

pub mod state_machine_tests;
pub mod fuzz_tests;
pub mod storage_verification;

use soroban_sdk::{testutils::Address as _, Address, Env, BytesN};
use crate::{GovernanceContract, GovernanceContractClient};

pub const CONTRACT_ID: BytesN<32> = BytesN::from_array(&soroban_sdk::Env::default(), &[0; 32]);

/// Returns a pre-initialised environment with 5 voter addresses funded and registered.
pub fn setup_governance_env() -> (Env, GovernanceContractClient<'static>, std::vec::Vec<Address>) {
    let env = Env::default();
    
    // Register the contract natively
    let contract_id = env.register(GovernanceContract, ());
    let client = GovernanceContractClient::new(&env, &contract_id);
    
    // Initialize the governance contract parameters (Quorum: 200, Voting Duration: 100 ledgers)
    let admin = Address::generate(&env);
    client.initialize(&admin, &200, &100);
    
    let mut voters = std::vec::Vec::new();
    for _ in 0..5 {
        voters.push(Address::generate(&env));
    }
    
    (env, client, voters)
}

#[test]
fn test_initialization() {
    let env = Env::default();
    let contract_id = env.register(GovernanceContract, ());
    let client = GovernanceContractClient::new(&env, &contract_id);
    
    let admin = Address::generate(&env);
    client.initialize(&admin, &200, &100);
    
    assert_eq!(client.admin(), admin);
    assert_eq!(client.quorum_threshold(), 200);
    assert_eq!(client.voting_duration(), 100);
}

#[test]
#[should_panic(expected = "already initialized")]
fn test_initialize_twice_fails() {
    let env = Env::default();
    let contract_id = env.register(GovernanceContract, ());
    let client = GovernanceContractClient::new(&env, &contract_id);
    
    let admin = Address::generate(&env);
    client.initialize(&admin, &200, &100);
    client.initialize(&admin, &200, &100);
}
