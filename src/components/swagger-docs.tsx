"use client";

import SwaggerUI from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";

export function SwaggerDocs() {
  return (
    <div className="min-h-screen bg-white">
      <SwaggerUI url="/api/openapi" docExpansion="list" persistAuthorization />
    </div>
  );
}
