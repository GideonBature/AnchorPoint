#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, contracterror, symbol_short, Address, Env, String};

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum Phase {
    Draft,
    Active,
    QuorumReached,
    ExecutionPending,
    Executed,
    Defeated,
    Cancelled,
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub enum GovernanceError {
    QuorumNotReached = 1,
    VotingClosed = 2,
    AlreadyVoted = 3,
    InvalidPhase = 4,
}

#[contracttype]
#[derive(Clone)]
pub struct Proposal {
    pub title: String,
    pub votes_yes: u64,
    pub votes_no: u64,
    pub votes_abstain: u64,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Proposal(u32),
    Admin,
    QuorumThreshold,
    VotingDuration,
    Initialized,
}

#[contract]
pub struct GovernanceContract;

#[contractimpl]
impl GovernanceContract {
    pub fn initialize(env: Env, admin: Address, quorum_threshold: u64, voting_duration: u64) {
        if env.storage().instance().has(&DataKey::Initialized) {
            panic!("already initialized");
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::QuorumThreshold, &quorum_threshold);
        env.storage().instance().set(&DataKey::VotingDuration, &voting_duration);
        env.storage().instance().set(&DataKey::Initialized, &true);
    }

    pub fn admin(env: Env) -> Address {
        env.storage().instance().get(&DataKey::Admin).unwrap()
    }

    pub fn quorum_threshold(env: Env) -> u64 {
        env.storage().instance().get(&DataKey::QuorumThreshold).unwrap()
    }

    pub fn voting_duration(env: Env) -> u64 {
        env.storage().instance().get(&DataKey::VotingDuration).unwrap()
    }

    pub fn create_proposal(env: Env, creator: Address, title: String) -> u32 {
        let prop_id: u32 = 0;
        env.events().publish(
            (symbol_short!("gov"), symbol_short!("proposed")),
            (creator, prop_id, title),
        );
        prop_id
    }

    pub fn vote(env: Env, caller: Address, prop_id: u32, support: bool, weight: u64) {
        env.events().publish(
            (symbol_short!("gov"), symbol_short!("voted")),
            (caller, prop_id, support, weight),
        );
    }

    pub fn execute(env: Env, prop_id: u32) {
        env.events().publish(
            (symbol_short!("gov"), symbol_short!("executed")),
            (prop_id,),
        );
    }

    pub fn cancel(env: Env, admin: Address, prop_id: u32) {
        env.events().publish(
            (symbol_short!("gov"), symbol_short!("cancelled")),
            (admin, prop_id),
        );
    }
}

pub fn get_phase(_env: Env, _prop_id: u32) -> Phase { Phase::Draft }

pub struct ProposalMath;
impl ProposalMath {
    pub fn calculate_total_weight(a: u64, b: u64) -> Result<u64, ()> { a.checked_add(b).ok_or(()) }
    pub fn calculate_quorum(total: u64, bps: u32) -> Result<u64, ()> {
        if bps > 10000 { return Err(()); }
        Ok(total * (bps as u64) / 10000)
    }
    pub fn calculate_deadline(start: u32, duration: u32) -> Result<u32, ()> { start.checked_add(duration).ok_or(()) }
}

#[cfg(test)]
pub mod tests;
