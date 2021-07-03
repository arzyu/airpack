import React from "react";
import { render } from "react-dom";

import "./index.css";

const MyPage = () => (
  <div styleName="page">
    <header>title</header>
    <div>content</div>
  </div>
);

render(
  <MyPage />,
  document.getElementById("root")
);
