pragma solidity ^0.4.11;

import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";
import "zeppelin-solidity/contracts/payment/PullPayment.sol";

contract Prediction is Ownable, PullPayment {

  using SafeMath for uint;

  // --------------------------------------------------
  // Init
  // --------------------------------------------------

  string public statement;
  uint public endBlock; // Bets close at endBlock.
  uint public killBlock; // Owner will be able to destroy contract after killBlock.

  function Prediction(string _statement, uint _blockDuration) {
    statement = _statement;
    endBlock = block.number.add(_blockDuration);

    // Calculate kill block as a percentage of total duration.
    uint _killBlock = _blockDuration / 4;
    if(_killBlock < 5) _killBlock = 5;
    if(_killBlock > 30000) _killBlock = 30000;
    killBlock = endBlock.add(_killBlock);
  }

  // --------------------------------------------------
  // Placing bets
  // --------------------------------------------------

  event BetEvent(address indexed from, bool prediction, uint value);

  mapping(bool => mapping(address => uint)) bets;
  mapping(bool => uint) public totals;

  function bet(bool prediction) payable onlyInState(State.Open) {
    if(msg.value == 0) revert();

    // Update user's balances.
    uint pos = bets[true][msg.sender];
    uint neg = bets[false][msg.sender];
    bets[true][msg.sender] = prediction ? pos.add(msg.value) : pos;
    bets[false][msg.sender] = !prediction ? neg.add(msg.value) : neg;

    // Keep track in totals pot.
    totals[prediction] = totals[prediction].add(msg.value);

    BetEvent(msg.sender, prediction, msg.value);
  }

  function getUserBalance(bool outcome) constant returns (uint) {
    return bets[outcome][msg.sender];
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

  event ClaimPrizeEvent(address indexed from);

  function claimPrize() onlyInState(State.Resolved) {

    // Calculate total prize.
    uint prize = calculatePrize(outcome);
    if(prize == 0) revert();

    // Assign funds.
    asyncSend(msg.sender, prize);
    bets[true][msg.sender] = 0;
    bets[false][msg.sender] = 0;

    ClaimPrizeEvent(msg.sender);
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

    uint balance = bets[prediction][msg.sender];
    if(balance == 0) return 0;

    uint feePercent = 2;

    uint winningPot = totals[outcome];
    uint losingPot = totals[!outcome];

    uint winPercentage = balance.div(winningPot);
    uint loserChunk = winPercentage.mul(losingPot);
    uint fee = loserChunk.mul(feePercent).div(100);
    uint prize = loserChunk.sub(fee).add(balance);

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

  event ClaimFeesEvent(address indexed from);

  function claimFees() onlyOwner {
    if(block.number <= killBlock) revert();
    ClaimFeesEvent(msg.sender);
    asyncSend(owner, this.balance);
  }
}
