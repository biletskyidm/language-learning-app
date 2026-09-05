import { fileURLToPath } from 'node:url'
import { CfnOutput, Duration, Stack, type StackProps } from 'aws-cdk-lib'
import { Architecture, FunctionUrlAuthType, Runtime } from 'aws-cdk-lib/aws-lambda'
import { NodejsFunction, OutputFormat } from 'aws-cdk-lib/aws-lambda-nodejs'
import type { Construct } from 'constructs'

export interface ApiStackProps extends StackProps {
  environment: Record<string, string>
}

export class ApiStack extends Stack {
  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props)

    const fn = new NodejsFunction(this, 'ApiFunction', {
      functionName: 'lang-learning-api-ts',
      runtime: Runtime.NODEJS_22_X,
      architecture: Architecture.ARM_64,
      entry: fileURLToPath(new URL('../../api/src/lambda.ts', import.meta.url)),
      handler: 'handler',
      memorySize: 1024,
      timeout: Duration.seconds(60), // two parallel LLM calls plus a retry must fit
      environment: props.environment,
      bundling: {
        format: OutputFormat.ESM,
        target: 'node22',
        externalModules: [],
        mainFields: ['module', 'main'],
        // mongodb is CJS and require()s node builtins lazily; ESM output needs a real require.
        banner: "import{createRequire}from'node:module';const require=createRequire(import.meta.url);",
      },
    })

    const url = fn.addFunctionUrl({ authType: FunctionUrlAuthType.NONE })

    new CfnOutput(this, 'ApiUrl', { value: url.url })
  }
}
