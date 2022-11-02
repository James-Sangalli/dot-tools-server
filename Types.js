"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultOptions = exports.emptyPoolObj = void 0;
const util_1 = require("@polkadot/util");
exports.emptyPoolObj = {
    depositor: "",
    memberCount: 0,
    nominator: "",
    pass: false,
    era: 0,
    poolStashAccountId: "",
    poolRewardAccountId: "",
    poolId: 0,
    root: "",
    state: "",
    stateToggler: ""
};
exports.defaultOptions = {
    checkForDuplicateValidators: false,
    checkRootVerified: false,
    checkValidators: false,
    era: 0,
    minNumberOfValidators: 1,
    rootMinStake: new util_1.BN(0),
    numberOfPools: 1,
};
