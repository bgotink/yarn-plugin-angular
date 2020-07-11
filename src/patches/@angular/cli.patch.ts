/* eslint-disable */
import {brotliDecompressSync} from 'zlib';

export default brotliDecompressSync(
  Buffer.from(
    'GyoFIMTANfUx6ob58JjsWLb8jCX/+XsXximlkQX6zu005gD61h44dUwqziZTi3DLHvyk307oeVDKDxssTNB5DIk/U2FaJDqqsTz1UKKUQj6YCCEIvHl5gbq4lNcQe9QxUiFpJRZ8XrVJUtnZqT5xa0Ow0WuLsfCVc1RZRZVHP7EfrDwUG9HHstTZoVvTCcPrUKycSVpLdR/TyuSeqJ4TMcuIxDVRTK4rhg0RYBJKYNYP/AQ2r4zBq+NgkSTIW/fM3/b6ONPMuWFeuOHY1ielFzj3Dy+5KkmX9GodZo+csPpfZbbYEaZf2EJjWQvblgmyk+HxSS6rMgBx65zEt1anpS+UMWw8b7g6V3vWfHo5t/J7EmGGhW0zmVgIFMSU+5F75yVOAeMckStN8IgaavdxKZqwmZCuCUk0DLjLpPvT1mbYPRGAVEIe2w8j/oyY3Mu/iEdyfriBiuwMT7wLjOJcYlMMSvUdRhIiq+WJP/H6JpUdYzrTugjDK29j1izq+pa1f3n7ks/G/gUEKCw7CVW5iTEqTt8i9c87RB8q2uwnat2UXZA4P7iT2Wp035i4DTL/PQn9fQePKGLfnA==',
    'base64',
  ),
).toString();
