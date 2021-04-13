// SPDX-License-Identifier: MIT

pragma solidity ^0.7.4;
pragma experimental ABIEncoderV2;

import "hardhat/console.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/Initializable.sol";
import './PsiLock.sol';
import './interfaces/IPsiLockFactory.sol';

contract PsiLockFactory is IPsiLockFactory, Initializable {
    using AddressUpgradeable for address;
    using SafeMath for uint;
    address[] public campaigns;
    address public override toFee;
    uint256 public override fee;
    address factory_owner;
    address public psi_address;
    address public override dpex_router;

    uint256 balance_required;

    modifier only_factory_Owner() {
        require(factory_owner == msg.sender, 'You are not the owner');
        _;
    }

    function initialize(
        address _PSI,
        uint256 min_balance,
        uint256 _fee,
        address _dpexRouter
    ) external initializer {
        factory_owner = msg.sender;
        toFee = msg.sender;
        psi_address = _PSI;
        balance_required = min_balance;
        fee = _fee;
        dpex_router = _dpexRouter;
    }

    //   1 ETH = 1 XYZ (_pool_rate = 1e18) <=> 1 ETH = 10 XYZ (_pool_rate = 1e19) <=> XYZ (decimals = 18)
   // _data = _softCap,_hardCap,_start_date, _end_date,_rate,_min_allowed,_max_allowed

    function createCampaign(
        uint256[] memory _data,
        address _token,
        uint256 _pool_rate,
        uint256 _lock_duration,
        uint256 _dpex_rate
    ) public override returns (address campaign_address) {
        require(IERC20(address(psi_address)).balanceOf(msg.sender) >= uint(balance_required),
            "You don't have the minimum UNL tokens required to launch a campaign");
        require(_data[0] < _data[1],"Error :  soft cap can't be higher than hard cap" );
        require(_data[2] < _data[3] ,"Error :  start date can't be higher than end date " );
        require(block.timestamp < _data[3] ,"Error :  end date can't be higher than current date ");
        require(_data[5] < _data[1],"Error :  minimum allowed can't be higher than hard cap " );
        require(_data[4] != 0,"rate can't be null");
        require(_dpex_rate >= 0 && _dpex_rate <= 1000);
        bytes memory bytecode = type(PsiLock).creationCode;
        bytes32 salt = keccak256(abi.encodePacked(_token, msg.sender));
        assembly {
                campaign_address := create2(0, add(bytecode, 32), mload(bytecode), salt)
        }
        PsiLock(campaign_address).initialize(_data,_token,msg.sender,_pool_rate,_lock_duration,_dpex_rate);
        campaigns.push(campaign_address);
        require(transferToCampaign(_data[1],_data[4],_pool_rate,_token,campaign_address,_dpex_rate),
            "unable to transfer funds");
        return campaign_address;
    }
    function transferToCampaign(
        uint256 _data1,
        uint256 _data4,
        uint256 _pool_rate,
        address _token,
        address _campaign_address,
        uint256 _dpex_rate
    ) internal returns(bool) {
        require(ApproveTransferTo(
            (_data1.mul(_data4).div(1e18)),
            _dpex_rate,_data1,
            _token,
            _campaign_address,
            _pool_rate
        ));
        return true;
    }
    function ApproveTransferTo(
        uint256 _data,
        uint256 _dpex_rate,
        uint256 _data1,
        address _token,
        address _campaign_address,
        uint256 _pool_rate
    ) internal returns(bool) {
        require(IERC20(address(_token)).transferFrom(
            msg.sender,
            address(_campaign_address),
            _data.add((_data1.mul(_dpex_rate)).mul(_pool_rate).div(1e21))
        ), "unable to transfer token amount to the campaign");
        return true;
    }

    function changeConfig(
        uint256 _fee,
        address _to,
        uint256 _balance_required,
        address _dpex_router,
        address _psi_address
    ) public only_factory_Owner returns(bool) {
        fee = _fee;
        toFee = _to;
        balance_required = _balance_required;
        dpex_router = _dpex_router;
        psi_address = _psi_address;
        return true;
    }
}