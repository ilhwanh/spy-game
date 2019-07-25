import * as React from 'react'
import * as _ from "lodash"
import { RoomUser } from "../common/common"

export class ActiveUsers extends React.Component {
  props: {
    users: Record<string, RoomUser>
  }

  render = () => {
    const bgClassName = "bg-dark text-center text-white d-flex justify-content-center align-items-center flex-wrap"
    const bgStyle: React.CSSProperties = {
      height: "6rem"
    }
    return <div className={bgClassName} style={bgStyle}>
      {_.toPairs(this.props.users).map(([userId, user]) => {
        return <div className={`ml-1 mr-1 badge ${user.status === "active" ? "badge-success" : "badge-warning"}`}>
          {user.name}
        </div>
      })}
    </div>
  }
}