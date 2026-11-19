import { Container, Typography } from "@mui/material";

import cypressLogo from "../svgs/cypress-logo.svg";
import { cypressUrl } from "./footerConfig";

export default function Footer() {
  return (
    <Container maxWidth="sm" style={{ marginTop: 50 }}>
      <Typography variant="body2" color="textSecondary" align="center">
        Built by
        <a
          style={{ textDecoration: "none" }}
          target="_blank"
          rel="noopener noreferrer"
          href={cypressUrl}
        >
          <img
            src={cypressLogo}
            alt=""
            style={{
              marginTop: -2,
              marginLeft: 5,
              height: "20px",
              width: "55px",
              verticalAlign: "middle",
            }}
          />
        </a>
      </Typography>
    </Container>
  );
}
