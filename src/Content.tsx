import * as React from 'react'
import * as _ from "lodash"
import { KeywordElem } from "../common/common"

export class Content extends React.Component {
  props: {
    content: KeywordElem
  }

  render = () => {
    const bgClassName = "pt-5 pb-5 bg-dark text-center text-white d-flex justify-content-center align-items-center flex-wrap"
    const bgStyle: React.CSSProperties = {
      height: "24rem"
    }
    if (_.keys(this.props.content).length === 0) {
      return <div className={bgClassName} style={bgStyle}>
        <h4>게임이 시작되지 않았습니다</h4>
      </div>
    }
    else {
      const truth = this.props.content.truth || "???"
      return <div className={bgClassName} style={bgStyle}>
        <div className="badge badge-primary ml-3 mr-3">
          <h2>{truth}</h2>
        </div>
        {this.props.content.falses.map(keyword => (
          <div className="badge badge-secondary ml-3 mr-3">
            <h2>{keyword}</h2>
          </div>
        ))}
      </div>
    }
  }
}