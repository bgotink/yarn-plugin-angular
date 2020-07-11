/* eslint-disable */
import {brotliDecompressSync} from 'zlib';

export default brotliDecompressSync(
  Buffer.from(
    'G60DIKwGbPcKEyBSks3WsaWGmQHamM97MKQnS/XVDN6adUKBkXP6GPUDTJn8rnIELY8pq8r6kqWEq0+CpL72V8kU06FrAsi9Qqc9RtkDVQokJsY2nE18Jq9Qu8AfvKPqd6/zHCxbrG+IYreOeeI/6RldMn4bXfYRt7kivsgS4vwFiWLIspSKEueTK2kamWoOMQVNUchl+0d2QZyEJ65vbzhQnRyJsSzuXEIpxf4aBGAlSWAoQHfhsyRtMYZgeg+I4Qt6aBMsFwssTOfkNC5WEObpERaoSSGk608eW4FMPZBAasg/2vigDy3pEPrwonYHrvcKEGD/mJjzo4qRF/Et3laXS6YxlkvOEOu7aIH+RB9M5Jvr/N0WoqEOKFo2FtJlJWrApjTMGdAw8s/o7+6KGLkligrC4n9IucPRUO3Wd/GdHQZcOSXYjdEjKMbs8J8hUowTyoYDwMmHRtHLe43gHhTZbaQwoFbYR/oL35avA+5+2QkD4UNkAA==',
    'base64',
  ),
).toString();
