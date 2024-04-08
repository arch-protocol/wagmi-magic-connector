import { OAuthExtension, OAuthProvider } from '@magic-ext/oauth'
import type {
  InstanceWithExtensions,
  MagicSDKAdditionalConfiguration,
  MagicSDKExtensionsOption,
  SDKBase,
} from '@magic-sdk/provider'
import type { Chain } from '@wagmi/core'
import { Magic } from 'magic-sdk'
import { MagicConnector, MagicOptions } from './magicConnector'

export interface DedicatedWalletOptions extends MagicOptions {
  callbackUrl?: string
  magicSdkConfiguration?: MagicSDKAdditionalConfiguration<
    string,
    OAuthExtension[]
  >
}

/**
 * Dedicated Wallet Connector class used to connect to wallet using Dedicated Wallet.
 * It uses modal UI defined in our package which also takes in various styling options
 * for custom experience.
 *
 * @example
 * ```typescript
 * import { DedicatedWalletConnector } from '@magiclabs/wagmi-connector';
 * const connector = new DedicatedWalletConnector({
 *  options: {
 *     apiKey: YOUR_MAGIC_LINK_API_KEY, //required
 *    ...Other options
 *  },
 * });
 * ```
 * @see https://github.com/magiclabs/wagmi-magic-connector#-usage
 * @see https://magic.link/docs/dedicated/overview
 */

export abstract class DedicatedWalletConnector extends MagicConnector {
  magicSDK?: InstanceWithExtensions<SDKBase, OAuthExtension[]>
  magicSdkConfiguration?: MagicSDKAdditionalConfiguration<
    string,
    MagicSDKExtensionsOption<OAuthExtension['name']>
  >
  oauthCallbackUrl?: string
  magicOptions: MagicOptions
  email?: string

  constructor(config: { chains?: Chain[]; options: DedicatedWalletOptions }) {
    super(config)
    this.magicSdkConfiguration = config.options.magicSdkConfiguration
    this.oauthCallbackUrl = config.options.callbackUrl
    this.magicOptions = config.options
  }

  /**
   * Get the Magic Instance
   * @throws {Error} if Magic API Key is not provided
   */
  getMagicSDK(): InstanceWithExtensions<SDKBase, OAuthExtension[]> {
    if (!this.magicSDK) {
      this.magicSDK = new Magic(this.magicOptions.apiKey, {
        ...this.magicSdkConfiguration,
        extensions: [new OAuthExtension()],
      })
    }
    return this.magicSDK
  }

  /**
   * checks if user is authorized with Magic.
   * It also checks for oauth redirect result incase user
   * comes from OAuth flow redirect.
   *  (without this check, user will not be logged in after oauth redirect)
   */
  async isAuthorized() {
    try {
      const magic = this.getMagicSDK()

      const isLoggedIn = await magic.user.isLoggedIn()
      if (isLoggedIn) return true

      const result = await magic.oauth.getRedirectResult()
      if (result !== null) {
        this.email = result.magic.userMetadata.email ?? ''
        return true
    }

    return false
    } catch {}
    return false
  }
}