pragma solidity ^0.4.11;

import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";
import "zeppelin-solidity/contracts/payment/PullPayment.sol";
import "zeppelin-solidity/contracts/lifecycle/Destructible.sol";

contract Market is Ownable, PullPayment, Destructible {

  using SafeMath for uint;

  // --------------------------------------------------
  // Init
  // --------------------------------------------------

  string public statement;
  uint public endBlock; // bets close at endBlock
  uint public killBlock; // owner can withdraw fees at killBlock

  function Market(string _statement, uint _blockDuration) {
    statement = _statement;
    endBlock = block.number.add(_blockDuration);

    uint _killBlock = _blockDuration / 4;
    if(_killBlock < 5) _killBlock = 5;
    if(_killBlock > 30000) _killBlock = 30000;
    killBlock = endBlock.add(_killBlock);
  }

  // --------------------------------------------------
  // Placing bets
  // --------------------------------------------------

  event BetEvent(address indexed from, bool prediction, uint value);

  mapping(address => mapping(bool => uint)) public bets;
  mapping(bool => uint) public totals;

  function bet(bool prediction) payable onlyInState(State.Open) {

    // Update user's balances.
    uint pos = bets[msg.sender][true];
    uint neg = bets[msg.sender][false];
    bets[msg.sender][true] = prediction ? pos.add(msg.value) : pos;
    bets[msg.sender][false] = !prediction ? neg.add(msg.value) : neg;

    // Keep track in totals pot.
    totals[prediction] = totals[prediction].add(msg.value);

    BetEvent(msg.sender, prediction, msg.value);
  }

  function getPlayerBalance(bool outcome) constant returns (uint) {
    return bets[msg.sender][outcome];
  }

  function getPredictionBalance(bool prediction) constant returns (uint) {
    return totals[prediction];
  }

  // --------------------------------------------------
  // Resolution
  // --------------------------------------------------

  bool public outcome;

  event ResolveEvent(bool outcome);

  function resolve(bool _outcome) onlyOwner onlyInState(State.Closed) {
    outcome = _outcome;
    resolved = true;
    ResolveEvent(outcome);
  }

  // --------------------------------------------------
  // Prize withdrawals
  // --------------------------------------------------

  event ClaimEvent(address indexed from);

  function claimPrize() onlyInState(State.Resolved) {

    // Calculate total prize.
    uint prize = calculatePrize(outcome);
    LogEvent('prize', prize);
    if(prize == 0) revert();

    // Assign funds.
    asyncSend(msg.sender, prize);
    bets[msg.sender][true] = 0;
    bets[msg.sender][false] = 0;

    ClaimEvent(msg.sender);
  }

  function calculatePrize(bool prediction) constant returns (uint) {

    /*
      The balance is split between a losing and a winning pot.
      Winners take chunks away from the losing pot according to the percentage
      they represented in the winning pot, as well as recovering their original bet.
      A small fee of the loser takeaway chunk is retained for the contract owner.
    */

    // Cant predict the future.
    if(!resolved) return 0;

    // No prize if outcome is not matched.
    if(prediction != outcome) return 0;

    uint balance = bets[msg.sender][prediction];
    if(balance == 0) return 0;
    /*LogEvent('bet.balance', bet.balance);*/

    uint feePercent = 2;

    uint winningPot = totals[outcome];
    /*LogEvent('winningPot', winningPot);*/
    uint losingPot = totals[!outcome];
    /*LogEvent('losingPot', losingPot);*/

    uint winPercentage = balance.div(winningPot);
    /*LogEvent('winPercentage', winPercentage);*/
    uint loserChunk = winPercentage.mul(losingPot);
    /*LogEvent('loserChunk', loserChunk);*/
    uint fee = loserChunk.mul(feePercent).div(100);
    /*LogEvent('fee', fee);*/
    uint prize = loserChunk.sub(fee).add(balance);
    /*LogEvent('prize', prize);*/

    return prize;
  }

  // --------------------------------------------------
  // State
  // --------------------------------------------------

  bool private resolved;
  enum State { Open, Closed, Resolved }

  modifier onlyInState(State _state) {
    if(_state != getState()) { revert(); }
    _;
  }

  function getState() constant returns (State) {
    if(!resolved) {
      if(block.number <= endBlock) {
        return State.Open;
      }
      else {
        return State.Closed;
      }
    }
    else {
      return State.Resolved;
    }
  }

  // --------------------------------------------------
  // Destruction
  // --------------------------------------------------

  event DestroyEvent(address indexed from);

  function destroy() onlyOwner {
    if(block.number <= killBlock) {
      revert();
    }
    DestroyEvent(msg.sender);
    super.destroy();
  }

  // --------------------------------------------------
  // Debugging elements
  // (could be removed without hurting the contract)
  // --------------------------------------------------

  event LogEvent(string msg, uint value);

  function getBlockNumber() constant returns (uint) {
    return block.number;
  }
}
