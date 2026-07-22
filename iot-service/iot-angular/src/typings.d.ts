/* SystemJS module definition */
declare var module: NodeModule;
interface NodeModule {
  id: string;
}

// swagger-ui-dist tak menyertakan tipe; kita pakai bundle browser langsung
// (menghindari index.js yang butuh Node 'path').
declare module 'swagger-ui-dist/swagger-ui-bundle.js' {
  const SwaggerUIBundle: any;
  export default SwaggerUIBundle;
}
