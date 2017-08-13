import React from 'react';
import { connect } from 'react-redux';
import { Link } from 'react-router';
import _ from 'lodash';
import {
  getMarketPreview
} from '../actions';

import ConnectComponent from '../../common/components/ConnectComponent';

import {
  connectFactory
} from '../actions';

class ListMarkets extends React.Component {

  constructor() {
    super();
    this.state = {
      lastRecordedBlockNumber: 0
    };
  }

  componentWillMount() {
    this.refreshFactory();
  }

  refreshFactory() {
    if(this.props.isNetworkConnected) {
      const blockAdvanced = this.props.blockNumber && (this.props.blockNumber > this.state.lastRecordedBlockNumber);
      if(!this.props.isConnected || blockAdvanced) {
        if(this.props.blockNumber) this.setState({ lastRecordedBlockNumber: this.props.blockNumber });
        this.props.connectFactory();
      }
    }
  }

  refreshPreviews() {
    _.each(this.props.addresses, (address) => {
      if(!this.props.previews[address]) {
        this.props.getMarketPreview(address);
        return false;
      }
    });
  }

  render() {

    // CONNECTING...
    if(!this.props.isConnected) {
      return <ConnectComponent title="Connecting with market factory..."/>;
    }

    this.refreshPreviews();

    return (
      <div className="container">

        {/* TITLE */}
        <div className="page-header">
          <h1>Browse Markets</h1>
        </div>

        {/* CREATE MARKET PANEL */}
        <div className="row">
          <ul className="list-group">
            {_.map(this.props.addresses, (address) => {
              const preview = this.props.previews[address];
              const title = preview ? preview.statement : address;
              const balance = preview ? preview.balance : 0;
              return (
                <li className="list-group-item" key={address}>
                  <Link to={`/market/${address}`}>
                    {title} <span className="pull-right">{balance} ETH</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        {/* LINK TO CREATE */}
        <Link to="/create">
          <span className="glyphicon glyphicon-plus" aria-hidden="true"></span>&nbsp;
          Create a Market
        </Link>

      </div>
    );
  }
}

const mapStateToProps = (state, ownProps) => {
  return {
    addresses: state.factory.marketAddresses,
    previews: state.factory.previews,
    isNetworkConnected: state.network.isConnected,
    blockNumber: state.network.blockNumber,
    ...state.factory
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    connectFactory: () => dispatch(connectFactory()),
    getMarketPreview: (address) => dispatch(getMarketPreview(address))
  };
};

const ListMarketsComponent = connect(
  mapStateToProps,
  mapDispatchToProps
)(ListMarkets);

export default ListMarketsComponent;
