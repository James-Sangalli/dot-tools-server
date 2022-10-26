"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
require("@polkadot/api-augment");
const util_1 = require("@polkadot/util");
const util_2 = require("@polkadot/util");
const Types_1 = require("./Types");
class PoolSelector {
    /*
     * @param validatorSelector - the initialised validator selector module
     * @param api - the initialised polkadot.js instance
     * @param options - the custom options (see Options type)
     */
    constructor(validatorSelector, api, options = Types_1.defaultOptions) {
        this.minStake = options.rootMinStake.mul(new util_2.BN(10)).pow(new util_2.BN(api.registry.chainDecimals[0].toString()));
        this.minSpots = options.minSpots;
        this.desiredNumberOfPools = options.numberOfPools;
        this.era = options.era;
        this.minNumberOfValidators = options.minNumberOfValidators;
        this.api = api;
        this.validatorSelector = validatorSelector;
        this.maxMembers = options.maxMembers;
        this.checkRootVerified = options.checkRootVerified;
        this.checkForDuplicateValidators = options.checkForDuplicateValidators;
        this.checkValidators = options.checkValidators;
    }
    init() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.era == 0) {
                const { index } = JSON.parse((yield this.api.query.staking.activeEra()).toString());
                this.era = index;
            }
        });
    }
    /*
    * @dev - gets the pool's information and checks if it meets the criteria
    * @param - the pool id for a specific pool
    * @returns - a pool object containing info about the pool and whether it matches the criteria or not
    * */
    getPoolInfoAndMatchById(poolId) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.init();
            const data = yield this.api.query.nominationPools.bondedPools(poolId);
            if (data.isEmpty)
                return Types_1.emptyPoolObj; // this can happen if a pool was removed as the index remains
            const poolInfo = JSON.parse(data.toString());
            const { root, depositor, nominator, stateToggler } = poolInfo.roles;
            const pool = {
                pass: false,
                era: this.era,
                poolId: poolId,
                poolStashAccountId: this.getPoolAccount(new util_2.BN(poolId), 0),
                poolRewardAccountId: this.getPoolAccount(new util_2.BN(poolId), 1),
                depositor: depositor,
                root: root,
                nominator: nominator,
                stateToggler: stateToggler,
                state: poolInfo.state,
                memberCount: poolInfo.memberCounter,
            };
            return this.getCheckedPool(pool, poolInfo);
        });
    }
    /*
    * @dev - run the pool by the criteria set
    * @param pool - the unchecked pool object
    * @param poolInfo - the pool information returned from the bondedPools call
    * @returns - a pool object containing info about the pool and whether it matches the criteria or not
    * */
    getCheckedPool(pool, poolInfo) {
        return __awaiter(this, void 0, void 0, function* () {
            if (poolInfo.state != "Open") {
                return pool;
            }
            if (this.checkRootVerified) {
                const verified = yield this.getIsRootVerified(poolInfo.roles.root);
                if (!verified) {
                    return pool;
                }
            }
            const meetsStakingRequirement = yield this.getRootMeetsStakeRequirement(poolInfo.roles.root);
            if (!meetsStakingRequirement) {
                return pool;
            }
            const meetsMinSpotRequirement = this.maxMembers - poolInfo.memberCounter >= this.minSpots;
            if (!meetsMinSpotRequirement) {
                return pool;
            }
            if (this.checkValidators) {
                pool.pass = yield this.getValidatorsMeetCriteriaByPoolId(pool.poolStashAccountId);
            }
            else {
                pool.pass = true;
            }
            return pool;
        });
    }
    /*
    * @dev see https://github.com/polkadot-js/apps/blob/v0.121.1/packages/page-staking/src/usePoolAccounts.ts#L17
    * */
    getPoolAccount(poolId, index) {
        const palletId = this.api.consts.nominationPools.palletId.toU8a();
        const EMPTY_H256 = new Uint8Array(32);
        const MOD_PREFIX = (0, util_1.stringToU8a)('modl');
        const U32_OPTS = { bitLength: 32, isLe: true };
        return this.api.registry.createType('AccountId32', (0, util_1.u8aConcat)(MOD_PREFIX, palletId, new Uint8Array([index]), (0, util_1.bnToU8a)(poolId, U32_OPTS), EMPTY_H256)).toString();
    }
    /*
    * @dev - checks whether a specific pool's validator set meets the criteria set
    * @param - the account id of the specified pool
    * @returns - true if it meets the criteria else false
    * */
    getValidatorsMeetCriteriaByPoolId(poolAccountId) {
        return __awaiter(this, void 0, void 0, function* () {
            const validatorsSelected = yield this.api.query.staking.nominators(poolAccountId);
            if (validatorsSelected.isEmpty) {
                return false;
            }
            const { targets } = JSON.parse(validatorsSelected.toString());
            if (targets.length < this.minNumberOfValidators) {
                return false;
            }
            const duplicatesOrNotChecked = yield this.getHasDuplicateValidators(targets);
            if (duplicatesOrNotChecked) {
                return false;
            }
            return this.getValidatorsMeetCriteria(targets);
        });
    }
    /*
    * @dev check validators meet the criteria
    * @param targets - the validator addresses
    * @returns - true if meets criteria else false
    * */
    getValidatorsMeetCriteria(targets) {
        return __awaiter(this, void 0, void 0, function* () {
            for (let t of targets) {
                const meetsCriteria = yield this.validatorSelector.getMeetsCriteriaByAccountId(t);
                if (!meetsCriteria) {
                    return false;
                }
            }
            return true;
        });
    }
    /*
    * @dev check if duplicate validators are present in a pool
    * @dev ignore if user has not enabled the check
    * @param targets - the validator addresses
    * @returns - true if duplicates are present, else false
    * */
    getHasDuplicateValidators(targets) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.checkForDuplicateValidators) {
                const entities = {};
                for (let t of targets) {
                    const identity = yield this.api.query.identity.identityOf(t);
                    if (!identity.isEmpty) {
                        const { info } = JSON.parse(identity.toString());
                        if (entities[info.display.raw]) {
                            return true;
                        }
                        entities[info.display.raw] = true;
                    }
                    else {
                        return true; // can't verify if duplicate or not so we assume they are
                    }
                }
            }
            return false;
        });
    }
    /*
    * @dev - get pools meeting the criteria
    * @returns - an array of matching pool objects
    * */
    getPoolsMeetingCriteria() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.init();
            const matchingPools = [];
            const numberOfPools = yield this.api.query.nominationPools.counterForRewardPools();
            const randomisedOrder = PoolSelector.randomiseOrder(numberOfPools.toNumber());
            for (let i = 0; i < randomisedOrder.length; i++) {
                console.log(randomisedOrder[i])
                const pool = yield this.getPoolInfoAndMatchById(randomisedOrder[i]);
                if (pool.pass)
                    matchingPools.push(pool);
                if (matchingPools.length == this.desiredNumberOfPools)
                    break;
            }
            return matchingPools;
        });
    }
    /*
    * @dev - randomise the pool ids so that we check them randomly rather than sequentially (this would give an advantage to earlier pools)
    * @param count - the number of pools created
    * @returns - an array of randomised values based on the pool count
    * */
    static randomiseOrder(count) {
        const order = [];
        while (order.length < count) {
            const r = Math.floor(Math.random() * count) + 1;
            if (order.indexOf(r) === -1)
                order.push(r);
        }
        return order;
    }
    /*
    * @dev - check if the root user has a verified identity
    * @returns - true if it does, else false
    * */
    getIsRootVerified(root) {
        return __awaiter(this, void 0, void 0, function* () {
            const identity = yield this.api.query.identity.identityOf(root);
            return !identity.isEmpty;
        });
    }
    /*
    * @dev - checks if the root user has put up enough stake
    * @param - the root address
    * @returns - true if it has, else false
    * */
    getRootMeetsStakeRequirement(root) {
        return __awaiter(this, void 0, void 0, function* () {
            const erasStakers = yield this.api.query.staking.erasStakers(this.era, root);
            const { own } = JSON.parse(erasStakers.toString());
            return own >= this.minStake;
        });
    }
}
exports.default = PoolSelector;
